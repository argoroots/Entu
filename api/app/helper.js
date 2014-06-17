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
