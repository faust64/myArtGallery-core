var assert  = require('assert');
var exec    = require('child_process').exec;
var express = require('express');
var mongo   = require('mongodb');
var sys     = require('sys');

var BIN_PATH       = '/home/syn/app/bin/'
var HTTP_PORT      = 8080;
var MONGO_DATABASE = 'myArtGallery';
var MONGO_HOST     = 'localhost';
var MONGO_PORT     = 27017;
var SEARCH_LIMIT   = 50;

var app       = express();
var client    = mongo.MongoClient;
var mongo_url = 'mongodb://' + MONGO_HOST + ':' + MONGO_PORT
	      + '/' + MONGO_DATABASE;

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin',
	'*');
//	'http://localhost:' + HTTP_PORT + '/');
    res.setHeader('Access-Control-Allow-Methods',
	'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers',
	'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.get('/', function (req, res) {
    res.send('Bad Request\n');
});

app.get(/^\/count\/artists\/+/, function (req, res, next) {
    client.connect(mongo_url, function(err, db) {
	assert.equal(null, err);
	console.log("MongoDB connection initiated, counting artists");

	var collection = db.collection('artists_cache');
	collection.count(function(derr, count) {
		assert.equal(null, derr);
		console.log("has " + count + " artists");
		res.send('{ count: ' + count + ' }');
		db.close();
	    });
    });
});

app.get(/^\/count\/artworks\/+/, function (req, res, next) {
    client.connect(mongo_url, function(err, db) {
	assert.equal(null, err);
	console.log("MongoDB connection initiated, counting artworks");

	var collection = db.collection('artworks_cache');
	collection.count(function(derr, count) {
		assert.equal(null, derr);
		console.log("has " + count + " artworks");
		res.send('{ count: ' + count + ' }');
		db.close();
	    });
    });
});

app.get(/^\/count\/events\/+/, function (req, res, next) {
    client.connect(mongo_url, function(err, db) {
	assert.equal(null, err);
	console.log("MongoDB connection initiated, counting events");

	var collection = db.collection('events_cache');
	collection.count(function(derr, count) {
		assert.equal(null, derr);
		console.log("has " + count + " events");
		res.send('{ count: ' + count + ' }');
		db.close();
	    });
    });
});

app.get(/^\/search\/artists\/(.+)\/+/, function (req, res, next) {
    client.connect(mongo_url, function(err, db) {
	assert.equal(null, err);
	var collection = db.collection('artists_cache');
	var query      = { 'dname': new RegExp(req.params[0]) };
	var qopts      = { limit: SEARCH_LIMIT, sort: [['_id', -1]] };

	console.log("MongoDB connection initiated, looking for artists "
	    + "matching /" + req.params[0] + "/");
	collection.find(query, qopts).toArray(function(derr, docs) {
	    assert.equal(null, derr);
	    console.log("query ok");
	    res.send(docs);
	    db.close();
	});
    });
});

app.get(/^\/search\/artworks\/(.+)\/+/, function (req, res, next) {
    client.connect(mongo_url, function(err, db) {
	assert.equal(null, err);
	var collection = db.collection('artworks_cache');
	var query      = { 'dname': new RegExp(req.params[0]) };
	var qopts      = { limit: SEARCH_LIMIT, sort: [['_id', -1]] };

	console.log("MongoDB connection initiated, looking for piece "
	    + "matching /" + req.params[0] + "/");
	collection.find(query, qopts).toArray(function(derr, docs) {
	    assert.equal(null, derr);
	    console.log("query ok");
	    res.send(docs);
	    db.close();
	});
    });
});

app.get(/^\/search\/events\/(.+)\/+/, function (req, res, next) {
    client.connect(mongo_url, function(err, db) {
	assert.equal(null, err);
	var collection = db.collection('events_cache');
	var query      = { 'dname': new RegExp(req.params[0]) };
	var qopts      = { limit: SEARCH_LIMIT, sort: [['_id', -1]] };

	console.log("MongoDB connection initiated, looking for event "
	    + "matching /" + req.params[0] + "/");
	collection.find(query, qopts).toArray(function(derr, docs) {
	    assert.equal(null, derr);
	    console.log("query ok");
	    res.send(docs);
	    db.close();
	});
    });
});

app.get(/^\/artists\/(.+)\/+/, function (req, res, next) {
    client.connect(mongo_url, function(err, db) {
	assert.equal(null, err);
	var collection = db.collection('artists_cache');
//	var query      = { 'dname': req.params[0] };
	var query      = { $or: [ { 'dname': req.params[0] },
				  { 'id': req.params[0] } ] };
	var qopts      = { limit: 1, sort: [['_id', -1]] };

	console.log("MongoDB connection initiated, looking for artist "
	    + req.params[0]);
	collection.find(query, qopts).nextObject(function(derr, docs) {
	    assert.equal(null, derr);
	    console.log("got id " + docs['id']);
	    var extended = db.collection('artists');
	    var query    = { 'id': docs['id'] };
	    var qopts    = { limit: 1, sort: [['_id', -1]] };

	    extended.find(query, qopts).toArray(function(dderr, ddocs) {
		if (ddocs.length < 1) {
		    var args  = docs['id'] + ' ' + docs['dname'];
		    console.log("looking up for " + args);
		    var child = exec(BIN_PATH + "extended_artist_info " + args,
				    function(ddderr, stdo, stde) {
//					assert(null, ddderr);
					console.log("cache provisioned");
					extended.find(query, qopts).toArray(
					    function(dddderr, ddddocs) {
					        console.log("proxified artist "
							    + docs['id']);
						res.send(ddddocs);
					    });
				    });
		}
		else {
		    var now = new Date().getTime() / 1000;
		    var lifetime = ddocs[0]['ttl'] + ddocs[0]['fetched'];

		    console.log("got cached artist " + docs['id']);
		    console.log("now " + now + ", expiration time " + lifetime);
		    res.send(ddocs);
		    if (now > lifetime) {
			console.log("update required");
			var args  = docs['id'] + ' ' + docs['dname'] + ' upd';
			var child = exec(BIN_PATH + "extended_artist_info "
					+ args, function(ddderr, stdo, stde) {
					    console.log("database updated");
					});
		    }
		    db.close();
		}
	    });
	});
    });
});

app.get(/^\/artworks\/(.+)\/+/, function (req, res, next) {
});

app.get(/^\/events\/(.+)\/+/, function (req, res, next) {
});

app.get(/^\/artists\/+/, function (req, res, next) {
    client.connect(mongo_url, function(err, db) {
	assert.equal(null, err);
	var collection = db.collection('artists_cache');
	var query      = { };
	var qopts      = { limit: SEARCH_LIMIT, sort: [['_id', -1]] };

	console.log("MongoDB connection initiated, looking for artist index");
	collection.find(query, qopts).toArray(function(derr, docs) {
	    assert.equal(null, derr);
	    console.log("index to dynamize");
	    res.send(docs);
	});
    });
});

app.get(/^\/artworks\/+/, function (req, res, next) {
    client.connect(mongo_url, function(err, db) {
	assert.equal(null, err);
	var collection = db.collection('artworks_cache');
	var query      = { };
	var qopts      = { limit: SEARCH_LIMIT, sort: [['_id', -1]] };

	console.log("MongoDB connection initiated, looking for artworks index");
	collection.find(query, qopts).toArray(function(derr, docs) {
	    assert.equal(null, derr);
	    console.log("index to dynamize");
	    res.send(docs);
	});
    });
});

app.get(/^\/events\/+/, function (req, res, next) {
    res.send('Show all events\n');
});

console.log("Using " + mongo_url);
app.listen(HTTP_PORT);
console.log('Running on http://localhost:' + HTTP_PORT);
