exports.BIN_PATH       = '/etc/node/apps-available/myArtGallery/bin/';
exports.DEFAULT_SORT   = [[ 'dname', 1 ]];
exports.DYNAMIC_INDEX  = false;
exports.HTTP_PORT      = 8080;
exports.HTTP_HOSNAME   = '*';
exports.QUERY_TOP      = { "rank": { $gte: 0 } };
exports.SEARCH_LIMIT   = 21;
exports.TOP_SORT       = [[ 'rank', 'asc' ]];

var mongo          = require('mongodb');
var MONGO_DATABASE = 'myArtGallery';
var MONGO_HOST     = 'localhost';
var MONGO_PORT     = 27017;

exports.client    = mongo.MongoClient;
exports.mongo_url = 'mongodb://' + MONGO_HOST + ':' + MONGO_PORT
		  + '/' + MONGO_DATABASE;

exports.assert  = require('assert');
exports.exec    = require('child_process').exec;
exports.mongo   = require('mongodb');
