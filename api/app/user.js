var _e = require('./helper')
var _u = require('underscore')

var async       = require('async')
var querystring = require('querystring')
var request     = require('request')



// Oauth2 providers
var providers = {
    google: {
        url: {
            auth  : 'https://accounts.google.com/o/oauth2/auth',
            token : 'https://accounts.google.com/o/oauth2/token',
            user  : 'https://www.googleapis.com/oauth2/v2/userinfo',
        },
        scope: 'profile email',
        response_parser: JSON.parse,
        parse_user: function(user) {
            return {
                id : user.id + '@google',
                email   : user.email,
                name    : user.name,
                picture : user.picture,
            }
        }
    },
    facebook: {
        url: {
            auth  : 'https://www.facebook.com/dialog/oauth',
            token : 'https://graph.facebook.com/oauth/access_token',
            user  : 'https://graph.facebook.com/me',
        },
        scope: 'email',
        response_parser: querystring.parse,
        parse_user: function(user) {
            return {
                id : user.id + '@facebook',
                email   : user.email,
                name    : user.name,
                picture : 'https://graph.facebook.com/' + user.id + '/picture?type=large',
            }
        }
    },
    live: {
        url: {
            auth  : 'https://login.live.com/oauth20_authorize.srf',
            token : 'https://login.live.com/oauth20_token.srf',
            user  : 'https://apis.live.net/v5.0/me',
        },
        scope: 'wl.basic wl.emails',
        response_parser: JSON.parse,
        parse_user: function(user) {
            return {
                id : user.id + '@live',
                email   : user.emails.account,
                name    : user.name,
                picture : 'https://apis.live.net/v5.0/' + user.id + '/picture',
            }
        }
    },
}



// Redirect to provaider authentication page or authenticate user using provider info
exports.oauth2 = function(req, res) {
    var provider_name = req.params.provider
    if(!_u.has(providers, provider_name)) return res.status(400).json({'error': 'You can\'t login with this provider'})

    var user = {}

    var provider = providers[provider_name]
    if(req.query.code) {
        async.waterfall([
            function(callback) {
                request.post({strictSSL: true, url: provider.url.token, form: {
                    code          : req.query.code,
                    client_id     : req.entu[provider_name + '_id'],
                    client_secret : req.entu[provider_name + '_secret'],
                    redirect_uri  : _e.uri(req),
                    grant_type    : 'authorization_code',
                }}, callback)
            },
            function(response, body, callback) {
                request.get({strictSSL: true, url: provider.url.user + '?' + querystring.stringify({
                    access_token: provider.response_parser(body).access_token,
                })}, callback)
            },
            function(response, body, callback) {
                user.user = provider.parse_user(JSON.parse(body))
                if(!user.user.email) return callback(new Error('No email from provider'))

                // req.entu_db.collection('entity').findOne({'property.entu-user': user.id + '@' + user.provider}, callback)
                req.entu_db.collection('entity').findOne({'property.user': user.user.email}, {'_id': true}, callback)
            },
            function(item, callback) {
                if(!item) return callback(new Error('No match for ' + user.user.email))

                user.entity   = item._id
                user.ip       = req.ip
                user.browser  = req.headers['user-agent']
                user.login_dt = new Date()

                req.entu_db.collection('session').insert(user, callback)
            },
            function(session, callback) {
                req.session.id = null
                req.session.id = session[0]._id

                return callback(null)
            },
        ], function(err, item) {
            if(err) return res.status(500).json({ error: err.message })

            res.redirect('/api/user')
        })
    } else {
        res.redirect(provider.url.auth + '?' + querystring.stringify({
            response_type   : 'code',
            client_id       : req.entu[provider_name + '_id'],
            redirect_uri    : _e.uri(req),
            scope           : provider.scope,
            state           : _e.random(8),
            approval_prompt : 'auto',
            access_type     : 'online',
        }))
    }
}



// Destroy user session
exports.logout = function(req, res) {
    req.session = null
    res.json({ result: true })
}



// Return authenticated users entity
exports.user = function(req, res) {
    req.entu_db.collection('entity').findOne({'_id': req.entu_user}, function(err, item) {
        if(err) return res.status(500).json({ error: err.message })
        if(!item) return res.status(404).json({ error: 'No authenticated user' })

        res.json({ result: item })
    })
}
