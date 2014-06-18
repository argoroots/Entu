#!/usr/bin/env node

require('newrelic')

var _e      = require('./app/helper')
var _u      = require('underscore')

var async   = require('async')
var express = require('express')
var mongo   = require('mongodb')
var nomnom  = require('nomnom')
var session = require('cookie-session')

var entity  = require('./app/entity')
var user    = require('./app/user')



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
    maindb = db
    _e.log('connected to ' + opts.mongodb + ' (main DB)')
})



// Map routes and start server
express()
    .use(session({  // Start new cookie-session
        name: 'entu',
        keys: [_e.random(8), _e.random(8)],
        maxage: 1000 * 60 * 60 * 24 * 14,
        secret: _e.random(16),
    }))
    .use(function(req, res, next) { // Save request info to request collection
        var start = Date.now()
        res.on('finish', function() {
            req.entu_db.collection('request').insert({
                date     : new Date(),
                ip       : req.headers['x-real-ip'],
                duration : Date.now() - start,
                status   : res.statusCode,
                port     : opts.port,
                method   : req.method,
                protocol : req.protocol,
                host     : req.host,
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
    .use(function(req, res, next) { // Set customer preferences and DB connection to request
        req.entu = {}
        if(_u.has(settings, req.host) && _u.has(dbs, req.host)) {
            req.entu    = settings[req.host]
            req.entu_db = dbs[req.host]
            next()
        } else {
            maindb.collection('entity').findOne({'property.domain': req.host}, function(err, item) {
                if(err) return res.json(500, {error: err.message})
                if(!item) return res.json(404, {error: 'No domain ' + req.host})
                mongo.MongoClient.connect(item.property.mongodb[0], {server: {auto_reconnect: true}}, function(err, db) {
                    req.entu = settings[req.host] = {
                        google_id       : item.property['auth-google'][0].split('\n')[0],
                        google_secret   : item.property['auth-google'][0].split('\n')[1],
                        facebook_id     : item.property['auth-facebook'][0].split('\n')[0],
                        facebook_secret : item.property['auth-facebook'][0].split('\n')[1],
                        live_id         : item.property['auth-live'][0].split('\n')[0],
                        live_secret     : item.property['auth-live'][0].split('\n')[1],
                    }
                    req.entu_db = dbs[req.host] = db
                    next()
                    _e.log('connected to ' + item.property.mongodb)
                })
            })
        }
    })
    .use(function(req, res, next) { // Set authenticated users id to request
        req.entu_db.collection('session').findOne({'session': req.session.key, 'browser_hash': _e.browser_hash(req)}, {'_id':false, 'entity': true}, function(err, s) {
            if(err) _e.error(err)
            if(!err && s) req.entu_user = s.entity
            next()
        })
    })

    .get('/entity', entity.list)
    .get('/entity/:id', entity.get)
    .get('/user', user.user)
    .get('/auth/exit', user.logout)
    .get('/auth/:provider', user.oauth2)
    .get('*', function(req, res) { res.json(404, {error: '404'}) })

    .listen(parseInt(opts.port))



// Log all uncaught errors
// process.on('uncaughtException', _e.error)



_e.log('node ' + process.version + ' is ready to serve on port ' + opts.port)
