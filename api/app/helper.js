var _u = require('underscore')

var util = require('util')
var async = require('async')
var mongo = require('mongodb')
var crypto = require('crypto')



var dbs = {}



exports.log = log
function log(data) {
    console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' - ' + data)
}



exports.error = error
function error(err) {
    if(util.isError(err)) err = err.stack
    console.error(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' - ' + err)
}



exports.random = random
function random(len) {
    return crypto.randomBytes(len).toString('hex')
}



exports.id = id
function id(id) {
    try {
        return new mongo.BSONPure.ObjectID(id)
    } catch(err) {

    }
}



exports.db = db
function db(host, cb) {
    if(_u.has(dbs, host)) return cb(null, dbs[host])
    try {
        mongo.MongoClient.connect(get_preferences(host, 'mongodb'), {server: {auto_reconnect: true}}, function(err, connection) {
            if(err) return cb(err)
            log(host + ' connected to mongodb')
            dbs[host] = connection
            return cb(err, connection)
        })
    } catch(err) {
        return cb(err)
    }
}



exports.collection = collection
function collection(host, collection, cb) {
    async.waterfall([
        function(callback) {
            db(host, callback)
        },
        function(conn, callback) {
            conn.collection(collection, callback)
        },
        function(collection, callback) {
            return cb(null, collection)
        },
    ], function(err, collection, callback) {
        if(err) return cb(err)
        return cb(null, collection)
    })
}



exports.get_preferences = get_preferences
function get_preferences(host, key) {
    var prefs = {
        'mongo.entu.ee': {
            mongodb         : '',
            google_id       : '',
            google_secret   : '',
            facebook_id     : '',
            facebook_secret : '',
            live_id         : '',
            live_secret     : '',
        },

    }

    return prefs[host][key]
}
