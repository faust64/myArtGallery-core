var common  = require('./config.js');

exports.countArtists = function (req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	console.log("MongoDB connection initiated, counting artists");

	var collection = db.collection('artists_cache');
	collection.count(function(derr, count) {
		common.assert.equal(null, derr);
		console.log("has " + count + " artists");
		res.send('{ count: ' + count + ' }');
		db.close();
	    });
    });
};

exports.searchArtists = function (req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	var collection = db.collection('artists_cache');
	if (req.params[0] != "") {
	    var skip   = req.params[0].replace(/^\+/, '');
	} else {
	    var skip   = 0;
	}
	var query      = { };
	var qopts      = { limit: common.SEARCH_LIMIT,
			   sort: common.DEFAULT_SORT,
			   skip: skip };
	if (req.params[1] != '*') {
	    query['dname'] = new RegExp(req.params[1]);
	}

	console.log("MongoDB connection initiated, looking for artists "
	    + "matching /" + req.params[1] + "/ [offset:" + skip + "]");
	collection.find(query, qopts).toArray(function(derr, docs) {
	    common.assert.equal(null, derr);
	    console.log("query ok");
	    res.send(docs);
	    db.close();
	});
    });
};

exports.getArtist = function(req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	var collection = db.collection('artists_cache');
	var query      = { $or: [ { 'dname': req.params[0] },
				  { 'id': parseInt(req.params[0]) } ] };
	var qopts      = { limit: 1, sort: common.DEFAULT_SORT };

	console.log("MongoDB connection initiated, looking for artist "
	    + req.params[0]);
	collection.find(query, qopts).nextObject(function(derr, docs) {
	    common.assert.equal(null, derr);
	    if (docs && docs['id']) {
		console.log("got id " + docs['id']);
		var extended = db.collection('artists');
		var query    = { 'id': docs['id'] };
		var qopts    = { limit: 1, sort: common.DEFAULT_SORT };
console.log(query);
console.log(qopts);
console.log(common.BIN_PATH + 'extended_artist_info');

		extended.find(query, qopts).toArray(function(dderr, ddocs) {
		    if (ddocs.length < 1) {
			var args  = docs['id'] + ' "' + docs['dname'] + '"';
			console.log("looking up for " + args);
			var child = common.exec(common.BIN_PATH
				  + "extended_artist_info " + args,
				    function(ddderr, stdo, stde) {
					console.log("cache provisioned");
					extended.find(query, qopts).toArray(
					    function(dddderr, ddddocs) {
					        console.log("proxified artist "
							    + docs['id']);
						res.send(ddddocs);
					    });
				    });
		    } else {
			var now = new Date().getTime() / 1000;
			var lifetime = ddocs[0]['ttl'] + ddocs[0]['fetched'];

			console.log("got cached artist " + docs['id']);
			console.log("now "+now+", expiration time "+lifetime);
			res.send(ddocs);
			if (now > lifetime) {
			    console.log("update required");
			    var args  = docs['id'] + ' "' + docs['dname'];
			    var child = common.exec(common.BIN_PATH
				      + "extended_artist_info " + args,
				      function(ddderr, stdo, stde) {
					  console.log("database updated");
				      });
			}
			db.close();
		    }
		});
	    } else {
		console.log('wat?');
		res.send({ dname: 'unknown artist' });
	    }
	});
    });
};

exports.topArtists = function (req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	var collection = db.collection('artists');
	var query      = { };
	if (req.params[0] != "") {
	    var skip   = req.params[0].replace(/^\+/, '');
	} else {
	    var skip   = 0;
	}
	var query      = common.QUERY_TOP;
	var qopts      = { limit: common.SEARCH_LIMIT,
			   sort: common.TOP_SORT,
			   skip: skip };

	console.log("MongoDB connection initiated, looking for top artists "
			+ "[offset:" + skip + "]");
	collection.find(query, qopts).toArray(function(derr, docs) {
	    common.assert.equal(null, derr);
	    console.log("query ok");
	    res.send(docs);
	});
    });
};

exports.indexArtists = function (req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	var collection = db.collection('artists_cache');
	var query      = { };
	if (common.DYNAMIC_INDEX) {
	    var qopts  = { };
	} else {
	    var qopts  = { limit: common.SEARCH_LIMIT,
			   sort: common.DEFAULT_SORT };
	}

	console.log("MongoDB connection initiated, looking for artist index");
	collection.find(query, qopts).toArray(function(derr, docs) {
	    common.assert.equal(null, derr);
	    if (common.DYNAMIC_INDEX) {
		var dlen = docs.length, rdocs = new Array();
		for (var cnt = 0; cnt < common.SEARCH_LIMIT; cnt++) {
		    var get = Math.floor(Math.random() * (dlen + 1));
		    rdocs[cnt] = docs[get];
		}
		console.log('index picked up ' + cnt + ' random artists');
		res.send(rdocs);
	    } else {
		console.log("index to dynamize");
		res.send(docs);
	    }
	});
    });
};
