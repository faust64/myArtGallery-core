var express     = require('express');
var common      = require('./lib/config.js');
var libArtists  = require('./lib/artists.js');
var libArtworks = require('./lib/artworks.js');
var libEvents   = require('./lib/events.js');
var app         = express();

app.use(function (req, res, next) {
    if (common.HTTP_HOSTNAME == '*') {
	var where = commmon.HTTP_HOSTAME;
    } else {
	var where = 'http://' + common.HTTP_HOSTNAME
		  + ':' + common.HTTP_PORT + '/';
    }
    res.setHeader('Access-Control-Allow-Origin', where);
    res.setHeader('Access-Control-Allow-Methods',
	'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers',
	'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.get('/', function (req, res) { res.send('Bad Request\n'); });

app.get(/^\/count\/artists\/+/, libArtists.countArtists);
app.get(/^\/count\/artworks\/+/, libArtworks.countArtworks);
app.get(/^\/count\/events\/+/, libEvents.countEvents);

app.get(/^\/search\/artists\/([+0-9]*)\/*([^\/]+)\/+/,
	libArtists.searchArtists);
app.get(/^\/search\/artworks\/([+0-9]*)\/*([^\/]+)\/+/,
	libArtworks.searchArtworks);
app.get(/^\/search\/events\/*([+0-9]*)\/([^\/]+)\/+/,
	libEvents.searchEvents);

app.get(/^\/artists\/([^\/]+)\/+/, libArtists.getArtist);
app.get(/^\/artworks\/([^\/]+)\/+/, libArtworks.getArtwork);
app.get(/^\/events\/([^\/]+)\/+/, libEvents.getEvent);

app.get(/^\/top\/artists\/([+0-9]*)\/*/, libArtists.topArtists);
app.get(/^\/top\/artworks\/([+0-9]*)\/*/, libArtworks.topArtworks);

app.get(/^\/artists\/+/, libArtists.indexArtists);
app.get(/^\/artworks\/+/, libArtworks.indexArtworks);
app.get(/^\/events\/+/, libEvents.indexEvents);

console.log("Using " + common.mongo_url);
app.listen(common.HTTP_PORT);
console.log('Running on http://localhost:' + common.HTTP_PORT);
