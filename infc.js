var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var express = require('express'),
    app = express();

var poppingConfig = null;
var config = {};

process.argv.forEach(function (val, index, array) {
  //console.log(index + ': ' + val);
  if (null === poppingConfig) {
    poppingConfig = 'infc.js';
  } else if (false === poppingConfig) {
    poppingConfig = val;
  } else {
    config[poppingConfig] = val;
    poppingConfig = false;
  }
});

config['-p'] = config['-p'] || 3001;
config['-f'] = config['-f'] || 'Watchfile';
config['-h'] = config['-h'] || 'localhost';
console.log(config);

fs.readFile(config['-f'] || 'Watchfile', 'utf8', function (err, data) {
  if (err) { throw err; }
  var watches = data.split("\n");
  watches.filter(function(element, index, array) {
    return !(null === element || 0 === element.length);
  }).forEach(function(validWatchDir, index, array) {
    console.log('watching: ' + validWatchDir);
    fs.watch(validWatchDir, function (event, filename) {
      console.log('event is: ' + event);
      if (filename) {
        var isChromeMeta = filename.startsWith('.com.google.Chrome');
        var isChromeDownload = filename.endsWith('.crdownload');

        if (isChromeMeta
            || isChromeDownload) { return; }

        console.log('filename provided: ' + filename);

      } else {
        console.log('filename not provided');
      }
    });
  });
});


app.use(function(req, res, next) {
  console.log(req.url);
  var isIndex = '/' === req.url;
  if (isIndex) {
    res.send('<pre>' + "wtf" + '</pre>');
  } else {
    next();
  }
});

// serve all files from public dir using built-in static file server
app.use(express.static(path.dirname(config['-f']) + '/public'));

var expressServer = app.listen(config['-p']);

spawn('/usr/bin/open', ['http://' + config['-h'] + ':' + config['-p'] + '/']);
