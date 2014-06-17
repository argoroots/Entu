var _u = require('underscore')

var async  = require('async')
var crypto = require('crypto')
var mongo  = require('mongodb')
var util   = require('util')



var dbs = {}



// Send message (with timestamp) to stdout
exports.log = log
function log(data) {
    console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' - ' + data)
}



// Send message (with timestamp) to stderr
exports.error = error
function error(err) {
    if(util.isError(err)) err = err.stack
    console.error(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' - ' + err)
}



// Generate random string with given length
exports.random = random
function random(len) {
    return crypto.randomBytes(len).toString('hex')
}



// Convert string to MongoDB ObjectID
exports.object_id = object_id
function object_id(id) {
    try {
        return new mongo.BSONPure.ObjectID(id)
    } catch(err) {
        return
    }
}



// Returns MD5 hash of given data
exports.md5 = md5
function md5(data) {
    return crypto.createHash('md5').update(data).digest('hex')
}


exports.uri = uri
function uri(req) {
    return req.protocol + '://' + req.host + req.path
}



// Returns MongoDB database connection to hosts database
exports.db = db
function db(host, callback) {
    if(_u.has(dbs, host)) return callback(null, dbs[host])
    mongo.MongoClient.connect(get_preferences(host, 'mongodb'), {server: {auto_reconnect: true}}, function(err, connection) {
        if(err) return callback(err)
        log(host + ' connected to mongodb')
        dbs[host] = connection
        return callback(null, connection)
    })
}



// Returns hosts confiquration
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
