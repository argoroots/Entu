var _e = require('./helper')
var _u = require('underscore')

var async = require('async')



// Return one entity with given id
exports.get = function(req, res) {
    var id = _e.object_id(req.params.id)
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



//Return list of entities
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
        query['search.et'] = {'$all': q}
    }
    // query['viewer'] = _e.object_id('539341ee4a8cc32b377a1dfb')

    user.user_id(req, function(id) {
        _e.log(id)
    })

    async.waterfall([
        function(callback) {
            _e.collection(req.host, 'entity', callback)
        },
        function(collection, callback) {
            async.series({
                // explain: function(callback) {
                //     collection.find(query).skip(skip).limit(limit).explain(callback)
                // },
                count: function(callback) {
                    collection.find(query).count(callback)
                },
                items: function(callback) {
                    collection.find(query).skip(skip).limit(limit).toArray(callback)
                },
            }, function(err, results) {
                if(err) return res.json(500, { error: err.message })

                res.json({
                    explain: results.explain,
                    count: results.count,
                    skip: skip,
                    limit: limit,
                    // result: results.items,
                })
            })
        },
    ])
}
