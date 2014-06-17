var _e = require('./helper')
var _u = require('underscore')

var async = require('async')

var user = require('./user')



// Return one entity with given id
exports.get = function(req, res) {
    var id = _e.object_id(req.params.id)
    if(!id) return res.json(404, { error: 'There is no entity ' + req.params.id })

    req.entu.db.collection('entity').findOne({'_id': id}, function(err, item) {
        if(err) return res.json(500, { error: err.message })
        if(!item) return res.json(404, { error: 'There is no entity with id ' + req.params.id })

        if(item.sharing === 'public') return res.json({ result: item })

        if(err || !req.entu.user || (item.sharing === 'private' && !_.contains(item.viewer, req.entu.user))) {
            return res.json(403, { error: 'No rights to view entity ' + req.params.id })
        } else {
            return res.json({ result: item })
        }
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
    if(req.entu.user) {
        query['$or'] = [{viewer: req.entu.user}, {sharing: {'$in': ['public', 'domain']}}]
    } else {
        query['sharing'] = 'public'
    }

    async.series({
        explain: function(callback) {
            req.entu.db.collection('entity').find(query).skip(skip).limit(limit).explain(callback)
        },
        count: function(callback) {
            req.entu.db.collection('entity').find(query).count(callback)
        },
        items: function(callback) {
            req.entu.db.collection('entity').find(query).skip(skip).limit(limit).toArray(callback)
        },
    }, function(err, results) {
        if(err) return res.json(500, { error: err.message })

        res.json({
            query: query,
            skip: skip,
            limit: limit,
            count: results.count,
            explain: results.explain,
            result: results.items,
        })
    })
}
