var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var express = require('express'),
    app = express();

var poppingConfig = null;
var config = {};
var messageCount = 0;

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
config['-c'] = null;

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

        config['-c'].write('id: ' + messageCount + '\n');
        config['-c'].write("data: " + filename + '\n\n'); // Note the extra newline
        messageCount = messageCount + 1;
      } else {
        console.log('filename not provided');
      }
    });
  });
});

app.use(function(req, res, next) {
  console.log(req.url);
  var isIndex = '/' === req.url;

  var indexHtml = '<!DOCTYPE html><html><head><script>var source = new EventSource("/stream");source.addEventListener("message",function(e){console.log(e.data);},false);</script></head><body></body></html>'
  if (isIndex) {
    res.send(indexHtml);
  } else {
    next();
  }
});

app.get('/stream', function(req, res) {
  // let request last as long as possible
  //req.socket.setTimeout(Infinity);

  if (config['-c']) {
    config['-c'].end();
  }

  config['-c'] = res;


  setInterval(function() {
    //res.write('id: ' + messageCount + '\n');
    //res.write("data: wtf" + '\n\n'); // Note the extra newline
    //messageCount = messageCount + 1;
  }, 1000);

  //send headers for event-stream connection
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');

  // The 'close' event is fired when a user closes their browser window.
  req.on("close", function() { });
});


// serve all files from public dir using built-in static file server
app.use(express.static(path.dirname(config['-f']) + '/public'));

var expressServer = app.listen(config['-p']);

//??? spawn('/usr/bin/open', ['http://' + config['-h'] + ':' + config['-p'] + '/']);
