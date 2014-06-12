#!/usr/bin/env node

require('newrelic')

var _e      = require('./app/helper')

var nomnom  = require('nomnom')
var express = require('express')
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



// Map routes and start server
express()
    .use(session({
        name: 'entu',
        keys: [_e.random(8), _e.random(8)],
        maxage: 1000 * 60 * 60 * 24 * 14,
        secret: _e.random(16),
    }))
    // .use(function(req, res) {
    //     _e.log(opts.port + ' ' + req.path)
    // })

    .get('/entity', entity.list)
    .get('/entity/:id', entity.get)
    .get('/user', user.user)
    // .get('/auth/exit', user.logout)
    .get('/auth/:provider', user.oauth2)
    .get('*', function(req, res) { res.json(404, {error: '404'}) })

    .listen(parseInt(opts.port))



// Log all uncaught errors
process.on('uncaughtException', _e.error)



_e.log('node ' + process.version + ' is ready to serve on port ' + opts.port)
