var _e  = require('./helper')
var _u = require('underscore')

var async = require('async')
var request = require('request')
var querystring = require('querystring')



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
                id      : user.id,
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
                id      : user.id,
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
                id      : user.id,
                email   : user.emails.account,
                name    : user.name,
                picture : 'https://apis.live.net/v5.0/' + user.id + '/picture',
            }
        }
    },
}



exports.oauth2 = function(req, res) {
    var provider_name = req.params.provider
    if(!_u.has(providers, provider_name)) return res.json(400, {'error': 'You can\'t login with this provider'})

    var provider = providers[provider_name]
    if(req.query.code) {
        async.waterfall([
            function(callback) {
                var data = {
                    code          : req.query.code,
                    client_id     : _e.get_preferences(req.host, provider_name + '_id'),
                    client_secret : _e.get_preferences(req.host, provider_name + '_secret'),
                    redirect_uri  : req.protocol + '://' + req.host + req.path,
                    grant_type    : 'authorization_code',
                }
                request.post(provider.url.token, {form: data}, callback )
            },
            function(response, body, callback) {
                var data = {
                    access_token: provider.response_parser(body).access_token,
                }
                request.get(provider.url.user + '?' + querystring.stringify(data), callback)
            },
        ], function(err, response, body) {
            if(err) return res.json(500, { error: err.message })

            var user = provider.parse_user(JSON.parse(body))

            var session = _e.random(32)

            user.session = session

            req.session.key = session
            res.json(user)
        })
    } else {
        var query = {
            response_type   : 'code',
            client_id       : _e.get_preferences(req.host, provider_name + '_id'),
            redirect_uri    : req.protocol + '://' + req.host + req.path,
            scope           : provider.scope,
            state           : _e.random(8),
            approval_prompt : 'auto',
            access_type     : 'online',
        }
        res.redirect(provider.url.auth + '?' + querystring.stringify(query))
    }
}



exports.user = function(req, res) {
    res.json(req.session.key)
}
