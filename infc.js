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


locate public
mkdir -p public/.sfc

*/

var crypto = require('crypto');
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var es = require('event-stream');

var lookup = require('mime-types').lookup;
var Promise = require('es6-promise').Promise;
var express = require('express');

var poppingConfig = null;
var config = {};
var messageCount = 0;

process.argv.forEach(function (val, index, array) {
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
config['publicDir'] = "public";

//console.log(config);

var promiseToSetResolvedFolderfilePath = function() {
  return new Promise(function(resolve, reject) {
    fs.realpath(config['-f'], function(err, fullFolderfilePath) {
      if (err) { reject(err); }
      config['resolvedFolerfileDirname'] = path.dirname(fullFolderfilePath);
      resolve(fullFolderfilePath);
    });
  });
};

var promiseToCreateStaticFileCabinetDirectory = function() {
  return new Promise(function(resolve, reject) {
    config['staticFileCabinetDirectory'] = config['resolvedFolerfileDirname'] + "/" + config['publicDir'] + "/.sfc/";

    fs.access(config['staticFileCabinetDirectory'], fs.R_OK | fs.W_OK, function (err) {
      if (err) {
        fs.mkdir(config['staticFileCabinetDirectory'], function(err) {
          if (err) { reject(err); }
          resolve(config['staticFileCabinetDirectory']);
        });
      } else {
        resolve(config['staticFileCabinetDirectory']);
      }
    });
  });
};

var splitChars = function(txt, num) {
  var result = [];
  for (var i = 0; i < txt.length; i += num) {
    result.push(txt.substr(i, num));
  }
  return result;
};

var checksum = function(str, algorithm, encoding) {
  return crypto.createHash(algorithm || 'md5').update(str, 'utf8').digest(encoding || 'hex');
};

var createClientInterface = function() {
  var source = new EventSource("/stream");
  source.addEventListener("message", function(e){
    console.log(e.data);
    var linkToFilePara = document.createElement('p');
    var linkToFile = document.createElement('a');
    var href = e.data;
    linkToFile.href = href;
    linkToFile.textContent = href;
    linkToFilePara.appendChild(linkToFile);
    document.body.appendChild(linkToFilePara);
  }, false);
};

var promiseToWatchFilesFromFolders = function(validDirsToWatch, sendFile) {
  validDirsToWatch.forEach(function(validDirAndTildeScape, index, array) {
    var tildeScape = validDirAndTildeScape[0];
    var validDir = validDirAndTildeScape[1];
    console.log('watching: ' + validDir);
    fs.watch(validDir, function (event, filename) {


      console.log('event is: ' + event);
      if (filename) {
        var isChromeMeta = filename.startsWith('.com.google.Chrome');
        var isChromeDownload = filename.endsWith('.crdownload');

        if (isChromeMeta
            || isChromeDownload) { return; }

        console.log('filename provided: ' + filename);

        promiseToListAllFilesToSync().then(function(allFiles) {
          allFiles.forEach(function(interestingFile) {
            sendFile(interestingFile);
          });
        });
        /*
        if (config['-c']) {
          //config['-c'].write('id: ' + messageCount + '\n');
          //config['-c'].write("data: " + filename + '\n\n'); // Note the extra newline
          //messageCount = messageCount + 1;
        } else {
          checkPathAndDo(filename); 
        }
        */
        //if ("function" === typeof(sendFile)) {
        //  sendFile(filename);
        //}
      } else {
        console.log('filename not provided');
      }
    });
  });
};


var stringPresent = function(str) {
  return !(null === str || 0 === str.length);
};

var promiseToListFolderfilesToSync = function() {
  return new Promise(function(resolve, reject) {
    fs.readFile(config['-f'], 'utf8', function (err, data) {
      if (err) { reject(err); }
      resolve(data.split("\n").filter(function(element, index, array) {
        return stringPresent(element);
      }).map(function(element) {
        //console.log(element.split("/"));
        var tildeScape = element.split("/").pop();
        return [tildeScape, element];
      }));
    });
  });
};

var loadIndexHtml = new Promise(function(resolve, reject) {
  fs.readFile(config['publicDir'] + '/index.html', function(err, data) {
    if (err) { reject(err); }
    resolve(data);
  });
});


var promiseToListAllFilesToSync = function() {
  var allFilesToSync = [];
  var allFileListingProcessPromises = [];
  return promiseToListFolderfilesToSync().then(function(foldersToSync) {
    console.log(foldersToSync);
    foldersToSync.forEach(function(folderToSyncAndTildeScape) {
      var tildeScape = folderToSyncAndTildeScape[0];
      var folderToSync = folderToSyncAndTildeScape[1];
      var folderToSyncPrefix = path.basename(folderToSync);
      var fileListingProcessPromise = new Promise(function(res, rej) {
        var fileListingProcess = spawn("find", ["-f", folderToSync]);
        fileListingProcess.stdout.pipe(es.split()).pipe(es.map(function (data, cb) {
          //console.log('Got the following message:', data);
          if (stringPresent(data) && folderToSync != data) {
            var canonFile = folderToSyncPrefix + data.replace(folderToSync, '');
            allFilesToSync.push(canonFile);
          }
          cb(null);
        }));
        fileListingProcess.stdout.on('close', function(err) {
          if (err) { rej(err); }
          res();
        });
      });
      allFileListingProcessPromises.push(fileListingProcessPromise);
    });
    return Promise.all(allFileListingProcessPromises).then(function() {
      return Promise.resolve(allFilesToSync);
    });
  });
};



var promiseToCopyFile = function(source, target, requested) {
console.log(source, target, requested);
  return new Promise(function(resolve, reject) {
        var mkdirAndCopyAndSymlink = "mkdir -p " + target + " && cp " + source + " " + target + " && mkdir -p " + path.dirname(requested) + " && ln -s " + target + "/" + path.basename(source) + " " + requested;
        var fileListingProcess = spawn("sh", ["-c", mkdirAndCopyAndSymlink]);
        fileListingProcess.stdout.pipe(es.split()).pipe(es.map(function (data, cb) {
          //console.log('Got the following message:', data);
          //if (stringPresent(data) && folderToSync != data) {
          //  var canonFile = folderToSyncPrefix + data.replace(folderToSync, '');
          //  allFilesToSync.push(canonFile);
          //}
          console.log("!!!", data);
          cb(null);
        }));
        fileListingProcess.stdout.on('close', function(err) {
          if (err) { reject(err); }
          resolve();
        });
/*
    var cbCalled = false;
    var done = function(err) {
      if (!cbCalled) {
        cbCalled = true;
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    };
    var rd = fs.createReadStream(source);
    rd.on("error", function(err) {
      done(err);
    });
    var wr = fs.createWriteStream(target);
    wr.on("error", function(err) {
      done(err);
    });
    wr.on("close", function(ex) {
      done();
    });
    rd.pipe(wr);
*/
  });
};


var promiseToListenForHttpRequests = function() {
  return new Promise(function(resolve, reject) {
    app = express();

    app.use(function(req, res, next) {
      var isRoot = '/' === req.path;
      var isInterfaceJavascript = '' === req.query.interfaceJavascript;
      console.log(req.path, req.query.interface, isInterfaceJavascript, app.get('env'));

      var redirectToIndexHtml = isRoot && app.get('env') != 'development' && !isInterfaceJavascript;
      var respondWithInterfaceHtml = isRoot && app.get('env') === 'development' && !isInterfaceJavascript;

      if (redirectToIndexHtml) {
        res.redirect('/index.html');
      } else if (respondWithInterfaceHtml) {
        loadIndexHtml.then(function(data) {
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
      var sendFile = (function(eventStreamResponse) {
        return function(filename) {
          eventStreamResponse.write('id: ' + messageCount + '\n');
          eventStreamResponse.write("data: " + filename + '\n\n'); // Note the extra newline
          messageCount = messageCount + 1;
        };
      })(res);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write('\n');

      req.on("close", function() { });

      promiseToListAllFilesToSync().then(function(allFiles) {
        allFiles.forEach(function(interestingFile) {
          sendFile(interestingFile);
        });
        return promiseToListFolderfilesToSync().then(function(foldersToSync) {
          return promiseToWatchFilesFromFolders(foldersToSync, sendFile);
        });
      });
    });

    app.use(function(req, res, next) {
      console.log("clerk tasks here: " + req.path);
      //var sentToCheck = shaCheckingProcess.stdin.write("/Users/mavenlink/Downloads/" + req.path + "\r\n");
      //res.set('Content-Type', 'text/html');
      //res.send(data);
      var requestedTildeScape = req.path.split("/")[1];
      promiseToListFolderfilesToSync().then(function(foldersToSyncAndTildeScapes) {
        console.log(foldersToSyncAndTildeScapes);
        foldersToSyncAndTildeScapes.forEach(function(folderToSyncAndTildeScape) {
          var foundTildeScape = folderToSyncAndTildeScape[0];
          var folderToSync = folderToSyncAndTildeScape[1];
          console.log(requestedTildeScape, foundTildeScape);
          if (foundTildeScape === requestedTildeScape) {
            
            var checkPath = config['publicDir'] + req.path;

            fs.readlink(checkPath, function(err, versionPath) {
              var existingFile = path.dirname(folderToSync) + req.path;
              if (err) {
                if ('ENOENT' === err.code) {
                  console.log('File not found!');

                  fs.readFile(existingFile, function (err, data) {
                    if (err) { throw err; }
                    var checksumOfInboundFile = checksum(data, 'sha1');
                    var splitDir = splitChars(checksumOfInboundFile, 8).join("/");
                    console.log(checksumOfInboundFile, splitChars(checksumOfInboundFile, 8).join("/"));
                    promiseToCopyFile(existingFile, config['staticFileCabinetDirectory'] + "FILES/" + splitDir, checkPath).then(function() {
                      console.log("copied");
                      res.set('Content-Type', 'text/html');
                      res.send("Copied ... reload?");
                    }).catch(function(err) {
                      console.log(err);
                    });
                  });
                } else {
                  throw err;
                }
              } else {
                ///Users/mavenlink/workspace/static-file-cabinet/public/.sfc/FILES/293ad002/c04a8f21/a5f95d99/b077c0a4/4bb6142e
                var shaDir = versionPath.replace(config['staticFileCabinetDirectory'] + "FILES/", "");
                var shaParts = shaDir.split("/");
                shaParts.pop();
                var shasum = shaParts.join("");
                console.log("FILE EXISTS!!!", versionPath, shasum);

                var shaCheckingProcess = spawn("shasum", ["-c", "-"]);

                console.log(shasum + " " + existingFile + "\n");
                shaCheckingProcess.stdin.write(shasum + "  " + existingFile + "\n");
                //console.log(shaCheckingProcess.stdin);
                shaCheckingProcess.stdin.end();

                //path.dirname(folderToSync) + req.path]);

                shaCheckingProcess.stdout.pipe(es.split()).pipe(es.map(function (data, cb) {
                  console.log('sha stdout: ' + data);
                  ///Users/mavenlink/Downloads/keep-synced/41aROjxVXbL._SY355_.jpg: OK
                  if (data.trim().endsWith(': OK')) {
                    var contentType = (lookup(checkPath) || 'application/octet-stream');
                    console.log(contentType);
                    res.set('Content-Type', contentType);
                    fs.readFile(checkPath, function (err, data) {
                      if (err) { throw err; }
                      res.send(data);
                    });
                  }
                  cb();
                }));

                shaCheckingProcess.stderr.pipe(es.split()).pipe(es.map(function (data, cb) {
                  console.log('sha stderr: ' + data);
                  cb();
                }));
              }
            });
          }
        });
      }).catch(function(err) {
        console.log(err);
      });
    });

    app.use(express.static(path.dirname(config['-f']) + '/' + config['publicDir']));

    resolve(app.listen(config['-p']));
  });
};

Promise.resolve()
.then(promiseToSetResolvedFolderfilePath)
.then(promiseToCreateStaticFileCabinetDirectory)
.then(promiseToListenForHttpRequests)
//.then(promiseToListAllFilesToSync)
//.then(function(allFiles) {
//  console.log("allfiles", allFiles);
//  //??? spawn('/usr/bin/open', ['http://' + config['-h'] + ':' + config['-p'] + '/']);
//})
.catch(function(err) {
  console.log(err);
});
