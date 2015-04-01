var common  = require('./config.js');

exports.countEvents = function (req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	console.log("MongoDB connection initiated, counting events");

	var collection = db.collection('events');
	collection.count(function(derr, count) {
		common.assert.equal(null, derr);
		console.log("has " + count + " events");
		res.send('{ count: ' + count + ' }');
		db.close();
	    });
    });
};

exports.searchEvents = function (req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	var collection = db.collection('events');
	if (req.query.country != undefined) {
	    var country = req.query.country;
	} else {
	    var country = '.*'
	}
	if (req.query.city != undefined) {
	    var city = req.query.city
	} else {
	    var city = '.*'
	}
	if (req.params[0] != "") {
	    var skip   = req.params[0].replace(/^\+/, '');
	} else {
	    var skip   = 0;
	}
	var query      = { 'dname': new RegExp(req.params[1]),
			   'city': new RegExp(city),
			   'country': new RegExp(country) };
	var qopts      = { limit: common.SEARCH_LIMIT,
			   sort: common.DEFAULT_SORT,
			   skip: skip };
	if (req.query.type != undefined &&
	    (req.query.type == "expo" || req.query.type == "auction")) {
	    query[req.query.type] = true;
	}

	console.log("MongoDB connection initiated, looking for event "
	    + "matching /" + req.params[1] + "/ having city matching /" + city
	    + "/ and country matching /" + country + "/ [offset:" + skip + "]");
	collection.find(query, qopts).toArray(function(derr, docs) {
	    common.assert.equal(null, derr);
	    console.log("query ok");
	    res.send(docs);
	    db.close();
	});
    });
};

exports.getEvent = function (req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	var collection = db.collection('events');
	var query      = { 'dname': req.params[0] };
	var qopts      = { limit: 1, sort: common.DEFAULT_SORT };

	console.log("MongoDB connection initiated, looking for event "
	    + req.params[0]);
	collection.find(query, qopts).nextObject(function(derr, docs) {
	    common.assert.equal(null, derr);
	    if (docs && docs['dname']) {
		console.log("query ok");
		res.send(docs);
	    } else {
		console.log('wat?');
		res.send({ dname: 'unknown event' });
	    }
	});
    });
};

exports.indexEvents = function (req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	var collection = db.collection('events');
	var now        = new Date().getTime() / 1000;
	var query      = { stops: { $gte: now },
			   starts: { $lte: now } };
	if (common.DYNAMIC_INDEX) {
	    var qopts  = { };
	} else {
	    var qopts  = { limit: common.SEARCH_LIMIT,
			   sort: common.DEFAULT_SORT };
	}
	if (req.query.type != undefined &&
	    (req.query.type == "expo" || req.query.type == "auction")) {
	    query[req.query.type] = true;
	}
	if (req.query.country != undefined) {
	    query['country'] = req.query.country;
	}
	if (req.query.city != undefined) {
	    query['city'] = req.query.city;
	}

	console.log("MongoDB connection initiated, looking for events index");
	collection.find(query, qopts).toArray(function(derr, docs) {
	    common.assert.equal(null, derr);
	    if (common.DYNAMIC_INDEX) {
		var dlen = docs.length, rdocs = new Array();
		for (var cnt = 0; cnt < common.SEARCH_LIMIT; cnt++) {
		    var get = Math.floor(Math.random() * (dlen + 1));
		    rdocs[cnt] = docs[get];
		}
		console.log('index picked up ' + cnt + ' random events');
		res.send(rdocs);
	    }
	    else {
		console.log("index to dynamize");
		res.send(docs);
	    }
	});
    });
};
