var _e = require('./helper')
var _u = require('underscore')

var async = require('async')

var user = require('./user')



// Return one entity with given id
exports.get = function(req, res) {
    var id = _e.object_id(req.params.id)
    if(!id) return res.status(400).json({ error: 'Invalid ID' })

    var query  = {'_id': id}
    if(req.entu_user) {
        query['$or'] = [{'_viewer': req.entu_user}, {'_sharing': {'$in': ['public', 'domain']}}]
    } else {
        query['_sharing'] = 'public'
    }

    var fields = req.query.fields ? _u.object(req.query.fields.split(','), _u.map(req.query.fields.split(','), function(field){ return true })) : {}

    async.waterfall([
        function(callback) {
            req.entu_db.collection('entity').findOne({'_id': id}, {'_id': true}, callback)
        },
        function(entity, callback) {
            if(!entity) return res.status(404).json({ error: 'There is no entity with given ID' })
            req.entu_db.collection('entity').findOne(query, fields, callback)
        },
    ], function(err, entity) {
        if(err)     return res.status(500).json({ error: err.message })
        if(!entity) return res.status(403).json({ error: 'No rights to view this entity' })

        res.json({
            query: query,
            fields: _u.keys(fields),
            result: entity,
        })
    })
}



//Return list of entities
exports.list = function(req, res) {
    var query  = {}
    var fields = req.query.fields ? _u.object(req.query.fields.split(','), _u.map(req.query.fields.split(','), function(field){ return true })) : {}
    var limit  = parseInt(req.query.limit) ? parseInt(req.query.limit) : 100
    var skip   = parseInt(req.query.page)  ? (parseInt(req.query.page) - 1) * limit  : 0

    if(req.query.definition) query['_definition'] = req.query.definition
    if(req.query.query) {
        var q = []
        _u.each(_u.uniq(req.query.query.toLowerCase().split(' ')), function(s) {
            q.push(new RegExp(s, 'i'))
        })
        query['_search.et'] = {'$all': q}
    }
    if(req.entu_user) {
        query['$or'] = [{'_viewer': req.entu_user}, {'_sharing': {'$in': ['public', 'domain']}}]
    } else {
        query['_sharing'] = 'public'
    }

    async.series({
        explain: function(callback) {
            req.entu_db.collection('entity').find(query, fields).skip(skip).limit(limit).explain(callback)
        },
        count: function(callback) {
            req.entu_db.collection('entity').find(query, fields).count(callback)
        },
        items: function(callback) {
            req.entu_db.collection('entity').find(query, fields).skip(skip).limit(limit).toArray(callback)
        },
    }, function(err, results) {
        if(err) return res.status(500).json({ error: err.message })

        res.json({
            query: query,
            fields: _u.keys(fields),
            skip: skip,
            limit: limit,
            count: results.count,
            explain: results.explain,
            result: results.items,
        })
    })
}
