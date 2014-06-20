var _e = require('./helper')
var _u = require('underscore')

var async = require('async')

var user = require('./user')


//Return list of entity definitions
exports.list = function(req, res) {
    var query = {}

    query['definition'] = 'conf-entity'

    if(req.entu_user) {
        query['$or'] = [{viewer: req.entu_user}, {sharing: {'$in': ['public', 'domain']}}]
    } else {
        query['sharing'] = 'public'
    }
    fields = {property:true}

    async.series({
        // explain: function(callback) {
        //     req.entu_db.collection('entity').find(query, fields).explain(callback)
        // },
        count: function(callback) {
            req.entu_db.collection('entity').find(query, fields).count(callback)
        },
        items: function(callback) {
            req.entu_db.collection('entity').find(query, fields).toArray(callback)
        },
    }, function(err, results) {
        if(err) return res.json(500, { error: err.message })
        var definitions = {}

        _u.each(results.items, function(i) {
            definitions[i.property.keyname[0]] = i.property
            definitions[i.property.keyname[0]]._id = i._id
        })

        res.json({
            a: results.items,
            query: query,
            count: results.count,
            explain: results.explain,
            result: definitions,
        })
    })

}
