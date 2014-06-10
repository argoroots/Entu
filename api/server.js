require('newrelic')

var _e      = require('./app/helper')

var express = require('express')
var session = require('cookie-session')



var entity  = require('./app/entity')
var user    = require('./app/user')



express()
    .use(session({
        name: 'entu',
        keys: [_e.random(8), _e.random(8)],
        maxage: 1000 * 60 * 60 * 24 * 14,
        secret: _e.random(16),
    }))

    .get('/entity', entity.list)
    .get('/entity/:id', entity.get)
    .get('/user', user.user)
    .get('/auth/:provider', user.oauth2)
    .get('*', function(req, res) { res.json(404, {error: '404'}) })

    .listen(80)



_e.log('ready to serve')
