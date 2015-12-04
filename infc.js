// functional-file-cabinet

// INBOX
// files named as their hashs
// /usr/bin/shasum ~/Downloads/001.gif 
// f83d1e71be12ea4fd9409fc917925aadc792a014  /Users/mavenlink/Downloads/001.gif
// VERSIONS
// ?v=

// nc -k -l 3456 | shasum -c -
// echo "0000000000000000000000000000000000000000  /Users/mavenlink/Downloads/001.gif" | nc localhost 3456
// readlink
//
/*

  public/
    .ffc
      DELETED => /dev/null
      FILES/
        sha2/5/6/index

      VERSIONS/
        infc.gif/
          .deleted => ../../DELETED
          abc123 => ../DROPBOX

    infc.gif => .infc/VERSIONS/infc.gif/abc123
*/

var crypto = require('crypto');
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
config['-f'] = config['-f'] || 'Folderfile';
config['-h'] = config['-h'] || 'localhost';
config['-c'] = null;

console.log(config);

var checksum = function(str, algorithm, encoding) {
  return crypto.createHash(algorithm || 'md5').update(str, 'utf8').digest(encoding || 'hex');
};

var checkPathAndDo = function(path) {
  var checkPath = "public/" + path;
  console.log(checkPath);

  fs.readlink(checkPath, function(err, versionPath) {
    if (err) {
      if ('ENOENT' === err.code) {
        console.log('File not found!');
        // touch public/      
        fs.readFile("/Users/mavenlink/Downloads/" + path, function (err, data) {
          if (err) { throw err; }
          var checksumOfInboundFile = checksum(data, 'sha1');
          console.log(checksumOfInboundFile);
        });
      } else {
        throw err;
      }
    }
  });
};

var createClientInterface = function() {
  var source = new EventSource("/stream");
  source.addEventListener("message", function(e){
    console.log(e.data);
    var linkToFile = document.createElement('a');
    linkToFile.href = e.data;
    linkToFile.innerText = e.data;
    document.body.appendChild(linkToFile);
  }, false);
};

var createWatchesFromFoldersBlock = function(validDirsToWatch) {
  validDirsToWatch.forEach(function(validDir, index, array) {
    console.log('watching: ' + validDir);
    fs.watch(validDir, function (event, filename) {
      console.log('event is: ' + event);
      if (filename) {
        var isChromeMeta = filename.startsWith('.com.google.Chrome');
        var isChromeDownload = filename.endsWith('.crdownload');

        if (isChromeMeta
            || isChromeDownload) { return; }

        console.log('filename provided: ' + filename);

        if (config['-c']) {
          config['-c'].write('id: ' + messageCount + '\n');
          config['-c'].write("data: " + filename + '\n\n'); // Note the extra newline
          messageCount = messageCount + 1;
        } else {
          checkPathAndDo(filename); 
        }
      } else {
        console.log('filename not provided');
      }
    });
  });
};

// nc -k -l 3456 | shasum -c -

var shaCheckingProcess = spawn("shasum", ["-c", "-"]);

shaCheckingProcess.stdout.on('data', function (data) {
  console.log('sha stdout: ' + data);
});

shaCheckingProcess.stderr.on('data', function (data) {
  console.log('sha stderr: ' + data);
});

fs.readFile(config['-f'], 'utf8', function (err, data) {
  if (err) { throw err; }

  createWatchesFromFoldersBlock(data.split("\n").filter(function(element, index, array) {
    return !(null === element || 0 === element.length);
  }));
});

app.use(function(req, res, next) {
  var isRoot = '/' === req.path;
  var isInterfaceJavascript = '' === req.query.interfaceJavascript; //'/?javascript' === req.url;
  console.log(req.path, req.query.interface, isInterfaceJavascript, app.get('env'));

  var redirectToIndexHtml = isRoot && app.get('env') != 'development' && !isInterfaceJavascript;
  var respondWithInterfaceHtml = isRoot && app.get('env') == 'development' && !isInterfaceJavascript;

  if (redirectToIndexHtml) {
    res.redirect('/index.html');
  } else if (respondWithInterfaceHtml) {
    fs.readFile('public/index.html', function(err, data) {
      if (err) { throw err; }
    
      res.set('Content-Type', 'text/html');
      res.send(data);
    });
  } else if (isInterfaceJavascript) {
    if ('development' === app.get('env')) {
      res.set('Content-Type', 'text/javascript');
      res.send('(' + createClientInterface.toString() + ')();');
    } else {
      res.end();
    }
  } else {
    next();
  }
});

app.get('/stream', function(req, res) {
  if (config['-c']) {
    config['-c'].end();
  }
  config['-c'] = res;

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

      //console.log("is link1", versionPath);
      //var sentToCheck = shaCheckingProcess.stdin.write("0000000000000000000000000000000000000000  /Users/mavenlink/Downloads/001.gif\n");
      //console.log(sentToCheck);
      //next();

app.use(function(req, res, next) {
  console.log("clerk tasks here: " + req.path);
  //var sentToCheck = shaCheckingProcess.stdin.write("/Users/mavenlink/Downloads/" + req.path + "\r\n");

});

// serve all files from public dir using built-in static file server
app.use(express.static(path.dirname(config['-f']) + '/public'));

var expressServer = app.listen(config['-p']);

//??? spawn('/usr/bin/open', ['http://' + config['-h'] + ':' + config['-p'] + '/']);
