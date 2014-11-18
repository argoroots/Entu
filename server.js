#!/usr/bin/env node

require('newrelic')

var _e         = require('./app/helper')
var _u         = require('underscore')

var async      = require('async')
var express    = require('express')
var mongo      = require('mongodb')
var nomnom     = require('nomnom')
var session    = require('cookie-session')

var entity     = require('./app/entity')
var definition = require('./app/definition')
var user       = require('./app/user')

var startup    = new Date().toISOString()



// Parse (and require) commandline arguments
var opts = nomnom.options({
    port: {
        abbr     : 'p',
        metavar  : 'PORT',
        required : true,
        help     : 'Entu API server will listen this port'
    },
    mongodb: {
        abbr     : 'm',
        metavar  : 'STRING',
        required : true,
        help     : 'MongoDB connection string'
    },
}).parse()



// All local variables
var settings = {}
var dbs = {}
var maindb = null



// Connect to main DB
mongo.MongoClient.connect(opts.mongodb, {server: {auto_reconnect: true}}, function(err, db) {
    if(err) return _e.error(err)
    maindb = db
    _e.log('connected to ' + opts.mongodb + ' (main DB)')
})



// Map routes and start server
express()
    .enable('trust proxy')  // Get correct IP from nginx
    .use(session({  // Start new cookie-session
        name: 'entu',
        keys: [_e.random(8), _e.random(8)],
        maxage: 1000 * 60 * 60 * 24 * 14,
        secret: _e.random(16),
    }))
    .use(function(req, res, next) { // Set customer preferences and DB connection to request
        var hostname = req.hostname //.replace('.entu.eu', '.entu.ee')
        req.entu = {}
        if(_u.has(settings, hostname) && _u.has(dbs, hostname)) {
            req.entu    = settings[hostname]
            req.entu_db = dbs[hostname]
            next()
        } else {
            if(!maindb) return res.status(500).json({error: 'Main DB is not configured correctly'})
            maindb.collection('entity').findOne({'domain': hostname}, function(err, item) {
                if(err) return res.status(500).json({error: err.message})
                if(!item) return res.status(404).json({error: 'Domain ' + hostname + ' is not configured'})
                try {
                    mongo.MongoClient.connect(item.mongodb[0], {server: {auto_reconnect: true}}, function(err, db) {
                        settings[hostname] = {}
                        if(item.auth_google)   settings[hostname].google_id       = item['auth_google'][0].split('\n')[0]
                        if(item.auth_google)   settings[hostname].google_secret   = item['auth_google'][0].split('\n')[1]
                        if(item.auth_facebook) settings[hostname].facebook_id     = item['auth_facebook'][0].split('\n')[0]
                        if(item.auth_facebook) settings[hostname].facebook_secret = item['auth_facebook'][0].split('\n')[1]
                        if(item.auth_live)     settings[hostname].live_id         = item['auth_live'][0].split('\n')[0]
                        if(item.auth_live)     settings[hostname].live_secret     = item['auth_live'][0].split('\n')[1]

                        req.entu = settings[hostname]
                        req.entu_db = dbs[hostname] = db

                        next()
                        _e.log('connected to ' + item.mongodb)
                    })
                } catch(err) {
                    return res.status(500).json({error: 'Domain ' + hostname + ' is not configured correctly'})
                }
            })
        }
    })
    .use(function(req, res, next) { // Save request info to request collection
        var start = Date.now()
        res.on('finish', function() {
            req.entu_db.collection('request').insert({
                date     : new Date(),
                ip       : req.ip,
                duration : Date.now() - start,
                status   : res.statusCode,
                port     : opts.port,
                method   : req.method,
                protocol : req.protocol,
                host     : req.hostname,
                path     : req.path,
                query    : req.query,
                body     : req.body,
                browser  : req.headers['user-agent'],
            }, function(err, item) {
                if(err) _e.error(err)
            })
        })
        next()
    })
    .use(function(req, res, next) { // Set authenticated users id to request
        req.entu_db.collection('session').findOne({'_id': _e.object_id(req.session.id), 'ip': req.ip, 'browser': req.headers['user-agent']}, {'_id':false, 'entity': true}, function(err, s) {
            if(err) _e.error(err)
            if(!err && s) req.entu_user = s.entity
            next()
        })
    })



    // URIs
    .get('/api/entity', entity.list)
    .get('/api/entity/:id', entity.get)

    .get('/api/definition', definition.list)

    .get('/api/user', user.user)
    .get('/api/user/auth/:provider', user.oauth2)
    .get('/api/user/exit', user.logout)

    .get('/api', function(req, res) {
        res.json({
            info: 'Entu API',
            version: '3.0.0',
            urls: [
                {
                    url: '/api/entity',
                    params: [
                        'query',
                        'fields',
                        'limit',
                        'skip',
                    ],
                },
                {
                    url: '/api/entity/:id',
                    params: [
                        'fields'
                    ],
                },
                {
                    url: '/api/user',
                    info: 'Returns user info'
                },
                {
                    url: '/api/user/auth/:provider',
                    params: [
                        'next'
                    ],
                },
                {
                    url: '/api/user/exit',
                    params: [
                        'next'
                    ],
                },
            ],
            'started': startup,
        })
    })

    .get('*', function(req, res) { res.status(404).json({error: '404'}) })



    // Start listening some port
    .listen(parseInt(opts.port))



// Log all uncaught errors
process.on('uncaughtException', _e.error)



_e.log('node ' + process.version + ' is ready to serve on port ' + opts.port)
