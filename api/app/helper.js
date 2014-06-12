var _u = require('underscore')

var util = require('util')
var async = require('async')
var mongo = require('mongodb')
var crypto = require('crypto')



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



// Returns MongoDB database connection to hosts database
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



// Returns MongoDB collection object for quering/edit to hosts database
exports.collection = collection
function collection(host, collection, cb) {
    async.waterfall([
        function(callback) {
            db(host, callback)
        },
        function(conn, callback) {
            conn.collection(collection, callback)
        },
    ], function(err, collection, callback) {
        if(err) return cb(err)
        return cb(null, collection)
    })
}



// Returns hosts confiquration
exports.get_preferences = get_preferences
function get_preferences(host, key) {
    var prefs = {
        'mongo.entu.ee': {
            mongodb         : 'mongodb://localhost:27017/eka',
            google_id       : '793935652433-ruptdb9ktjfnctfrt5tp72r17p24pacf.apps.googleusercontent.com',
            google_secret   : 'HoeRY9enUV78Z1IEcX2-3vrI',
            facebook_id     : '226715030775985',
            facebook_secret : 'a6d75580ec085717de6a1303281fd9c6',
            live_id         : '00000000480EA351',
            live_secret     : 'HXxx0FVYGb6SWEAEdCX3glMK7AEM8lHp',
        },

    }

    return prefs[host][key]
}
