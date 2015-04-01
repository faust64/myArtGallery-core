var common  = require('./config.js');

exports.countArtworks = function (req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	console.log("MongoDB connection initiated, counting artworks");

	var collection = db.collection('artworks_cache');
	collection.count(function(derr, count) {
		common.assert.equal(null, derr);
		console.log("has " + count + " artworks");
		res.send('{ count: ' + count + ' }');
		db.close();
	    });
    });
};

exports.searchArtworks = function (req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	var collection = db.collection('artworks_cache');
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
	if (req.query.type != undefined) {
	    query['type'] = req.query.type;
	}
	if (req.query.authorid != undefined) {
	    query['authorid'] = req.query.authorid;
	} else if (req.query.authordn != undefined) {
	    query['authordn'] = new RegExp(req.query.authordn);
	}

	console.log("MongoDB connection initiated, looking for piece "
	    + "matching /" + req.params[1] + "/ [offset:" + skip + "]");
	collection.find(query, qopts).toArray(function(derr, docs) {
	    common.assert.equal(null, derr);
	    console.log("query ok");
	    res.send(docs);
	    db.close();
	});
    });
};

exports.getArtwork = function (req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	var collection = db.collection('artworks_cache');
	var query      = { $or: [ { 'dname': req.params[0] },
				  { 'id': parseInt(req.params[0]) } ] };
	var qopts      = { limit: 1, sort: common.DEFAULT_SORT };
	if (req.query.authorid != undefined) {
	    query['authorid'] = req.query.authorid;
	} else if (req.query.authordn != undefined) {
	    query['authordn'] = new RegExp(req.query.authordn);
	}

	console.log("MongoDB connection initiated, looking for artwork "
	    + req.params[0]);
	collection.find(query, qopts).nextObject(function(derr, docs) {
	    common.assert.equal(null, derr);
	    if (docs && docs['id']) {
		console.log("got id " + docs['id']);
		var extended = db.collection('artworks');
		var query    = { 'id': docs['id'] };
		var qopts    = { limit: 1, sort: common.DEFAULT_SORT };

		extended.find(query, qopts).toArray(function(dderr, ddocs) {
		    if (ddocs.length < 1) {
			var args  = docs['id'] + ' "' + docs['dname'] + '" '
				  + docs['authorid'] + ' "'
				  + docs['authordname'] + '"';
			console.log("looking up for " + args);
			var child = common.exec(common.BIN_PATH
				  + "extended_artwork_info " + args,
				    function(ddderr, stdo, stde) {
					console.log("cache provisioned");
					extended.find(query, qopts).toArray(
					    function(dddderr, ddddocs) {
					        console.log("proxified artwork "
							    + docs['id']);
						res.send(ddddocs);
					    });
				    });
		    } else {
			var now = new Date().getTime() / 1000;
			var lifetime = ddocs[0]['ttl'] + ddocs[0]['fetched'];

			console.log("got cached artwork " + docs['id']);
			console.log("now "+now+", expiration time "+lifetime);
			res.send(ddocs);
			if (now > lifetime) {
			    console.log("update required");
			    var args  = docs['id'] + ' "' + docs['dname']
				      + '" ' + docs['authorid'] + ' "'
				      + docs['authordname'] + '"';
			    var child = common.exec(common.BIN_PATH
				      + "extended_artwork_info " + args,
				      function(ddderr, stdo, stde) {
					  console.log("database updated");
				      });
			}
			db.close();
		    }
		});
	    } else {
		console.log('wat?');
		res.send({ dname: 'unknown artwork' });
	    }
	});
    });
};

exports.topArtworks = function (req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	var collection = db.collection('artworks');
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

	console.log("MongoDB connection initiated, looking for top artworks "
			+ "[offset:" + skip + "]");
	collection.find(query, qopts).toArray(function(derr, docs) {
	    common.assert.equal(null, derr);
	    console.log("query ok");
	    res.send(docs);
	});
    });
};

exports.indexArtworks = function (req, res, next) {
    common.client.connect(common.mongo_url, function(err, db) {
	common.assert.equal(null, err);
	var collection = db.collection('artworks_cache');
	var query      = { };
	if (common.DYNAMIC_INDEX) {
	    var qopts  = { };
	} else {
	    var qopts  = { limit: common.SEARCH_LIMIT,
			   sort: common.DEFAULT_SORT };
	}

	console.log("MongoDB connection initiated, looking for artworks index");
	collection.find(query, qopts).toArray(function(derr, docs) {
	    common.assert.equal(null, derr);
	    if (common.DYNAMIC_INDEX) {
		var dlen = docs.length, rdocs = new Array();
		for (var cnt = 0; cnt < common.SEARCH_LIMIT; cnt++) {
		    var get = Math.floor(Math.random() * (dlen + 1));
		    rdocs[cnt] = docs[get];
		}
		console.log('index picked up ' + cnt + ' random artworks');
		res.send(rdocs);
	    }
	    else {
		console.log("index to dynamize");
		res.send(docs);
	    }
	});
    });
};
