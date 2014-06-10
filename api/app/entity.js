var _e = require('./helper')
var _u = require('underscore')

var async = require('async')



exports.get = function(req, res) {
    var id = _e.id(req.params.id)
    if(!id) return res.json(404, { error: 'There is no entity with id ' + req.params.id })

    async.waterfall([
        function(callback) {
            _e.collection(req.host, 'entity', callback)
        },
        function(collection, callback) {
            collection.findOne({'_id': id}, callback)
        },
    ], function(err, item) {
        if(err) return res.json(500, { error: err.message })
        if(!item) return res.json(404, { error: 'There is no entity with id ' + req.params.id })

        res.json({ result: item })
    })
}



exports.list = function(req, res) {
    var query = {}
    var limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 100
    var skip  = parseInt(req.query.page)  ? (parseInt(req.query.page) - 1) * limit  : 0

    if(req.query.definition) query['definition'] = req.query.definition
    if(req.query.query) {
        var q = []
        _u.each(_u.uniq(req.query.query.toLowerCase().split(' ')), function(s) {
            q.push(new RegExp(s, 'i'))
        })
        query['_search.et'] = {'$all': q}
    } else {
        query['definition'] = 'book'
        query['_search.et'] = _e.random(_u.random(2, 6))
    }

    async.waterfall([
        function(callback) {
            _e.collection(req.host, 'entity', callback)
        },
        function(collection, callback) {
            async.parallel({
                count: function(callback) {
                    collection.find(query).count(callback)
                },
                items: function(callback) {
                    collection.find(query).skip(skip).limit(limit).toArray(callback)
                },
            }, function(err, results) {
                if(err) return res.json(500, { error: err.message })

                res.json({
                    count: results.count,
                    skip: skip,
                    limit: limit,
                    result: results.items,
                })
            })
        },
    ])
}
