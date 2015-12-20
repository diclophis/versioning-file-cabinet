/*
// versioning-file-cabinet
// INBOX
// files named as their hashs
// f83d1e71be12ea4fd9409fc917925aadc792a014  /Users/mavenlink/Downloads/001.gif
// VERSIONS
// ?v=

  public/
    .vfc
      DELETED => /dev/null
      FILES/
        sha2/5/6/index

      VERSIONS/
        infc.gif/
          .deleted => ../../DELETED
          000000 => ../FILES/sha2/5/6/index

    infc.gif => .vfc/VERSIONS/infc.gif/000000

*/

var crypto = require('crypto');
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var es = require('event-stream');
var lookup = require('mime-types').lookup;
var Promise = require('es6-promise').Promise;
var express = require('express');
var MemoryFS = require("memory-fs");
var webpack = require("webpack");


var webpackConfig = {
  node: {
    console: true,
  },
  bail: true,
  entry: ["./client.js"],
  output: {
    path: '/',
    filename: "[name].js"
  }
}
var poppingConfig = null;
var config = {};
var mfs = new MemoryFS();
var compiler = webpack(webpackConfig);
compiler.outputFileSystem = mfs;


var promiseToCompileMainJs = function() {
  return new Promise(function(resolve, reject) {
    compiler.run(function(err, stats) {
      if (err) { return reject(err); }
      mfs.readFile("/main.js", function(err, data) {
        if (err) { return reject(err); }
        resolve(data);
      });
    });
  });
};


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


var stringPresent = function(str) {
  return !(null === str || 0 === str.length);
};


var promiseToWatchFilesFromFolders = function(validDirsToWatch, sendFile) {
  validDirsToWatch.forEach(function(validDirAndTildeScape, index, array) {
    var tildeScape = validDirAndTildeScape[0];
    var validDir = validDirAndTildeScape[1];
    fs.watch(validDir, function (event, filename) {
      if (filename) {
        var isChromeMeta = filename.startsWith('.com.google.Chrome');
        var isChromeDownload = filename.endsWith('.crdownload');
        var isSwp = filename.endsWith('.swp');
        if (isChromeMeta
            || isChromeDownload
            || isSwp) { return; }
      }
      promiseToListAllFilesToSync().then(function(allFiles) {
        allFiles.forEach(function(interestingFile) {
          var isInteresting = true;
          if (filename && !interestingFile.endsWith(filename)) {
            isInteresting = false;
          }
          if (isInteresting) {
            sendFile(interestingFile);
          }
        });
      });
    });
  });
};


var promiseToListFolderfilesToSync = function() {
  return new Promise(function(resolve, reject) {
    fs.readFile(config['-f'], 'utf8', function (err, data) {
      if (err) { reject(err); }
      resolve(data.split("\n").filter(function(element, index, array) {
        return stringPresent(element)
      }).map(function(element) {
        element = element.replace("~", process.env.HOME);
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
    foldersToSync.forEach(function(folderToSyncAndTildeScape) {
      var tildeScape = folderToSyncAndTildeScape[0];
      var folderToSync = folderToSyncAndTildeScape[1];
      var folderToSyncPrefix = path.basename(folderToSync);
      var fileListingProcessPromise = new Promise(function(res, rej) {
        var fileListingProcess = spawn("find", ["-f", folderToSync]);
        fileListingProcess.stdout.pipe(es.split()).pipe(es.map(function (data, cb) {
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


var promiseToCopyFile = function(source, sfcPath, requested) {
  return new Promise(function(resolve, reject) {
    fs.readFile(source, function (err, data) {
      if (err) { reject(err); }
      var checksumOfInboundFile = checksum(data, 'sha1');
      var splitDirPath = splitChars(checksumOfInboundFile, 8).join("/");
      var target = sfcPath + "FILES/" + splitDirPath;
      var versionsPath = sfcPath + "VERSIONS/" + requested;
      var indexPath = "index" + path.extname(source);
      var mkdirAndCopyAndSymlink = "mkdir -p " + versionsPath + " && mkdir -p " + target + " && cp " + source + " " + target + "/" + indexPath + " && mkdir -p " + path.dirname(requested) + " && export VERSION=$(ls -1 " + versionsPath + " | wc -l | awk '{ printf(\"%06d\", $1) }')" + " && ln -s " + target + "/" + indexPath + " " + versionsPath + "/$VERSION && ln -sf " + versionsPath + "/$VERSION " + requested + " && echo $VERSION";
      var fileListingProcess = spawn("sh", ["-c", mkdirAndCopyAndSymlink]);
      var version = null;
      fileListingProcess.stdout.pipe(es.split()).pipe(es.map(function (data, cb) {
        var trimmedLine = data.trim();
        if (0 != trimmedLine.length) {
          version = trimmedLine;
        }
        cb(null);
      }));
      fileListingProcess.stdout.on('close', function(err) {
        if (err) { reject(err); }
        resolve(version);
      });
    });
  });
};


var promiseToListenForHttpRequests = function() {
  return new Promise(function(resolve, reject) {
    app = express();
    app.use(function(req, res, next) {
      var isRoot = '/' === req.path;
      var isInterfaceJavascript = '' === req.query.interfaceJavascript;
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
        //TODO: ...
        if ('development' === app.get('env')) {
          promiseToCompileMainJs().then(function(indexJs) {
            res.set('Content-Type', 'text/javascript');
            res.send(indexJs);
          }).catch(function(err) {
            res.set('Content-Type', 'text/plain');
            res.status(500);
            res.send(err);
          });
        } else {
          res.end();
        }
      } else {
        next();
      }
    });
    app.get('/favicon.ico', function(req, res) {
      res.status(404).send('Not Found');
    });
    app.get('/stream', function(req, res) {
      var messageCount = 0;
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
      var requestedTildeScape = req.path.split("/")[1];
      promiseToListFolderfilesToSync().then(function(foldersToSyncAndTildeScapes) {
        foldersToSyncAndTildeScapes.forEach(function(folderToSyncAndTildeScape) {
          var foundTildeScape = folderToSyncAndTildeScape[0];
          var folderToSync = folderToSyncAndTildeScape[1];
          if (foundTildeScape === requestedTildeScape) {
            var checkPath = config['publicDir'] + req.path;
            fs.realpath(checkPath, function(err, versionPath) {
              var existingFile = path.dirname(folderToSync) + req.path;
              if (err) {
                if ('ENOENT' === err.code) {
                    promiseToCopyFile(existingFile, config['staticFileCabinetDirectory'], checkPath).then(function(newFileVersion) {
                      res.redirect(req.path + "?v=" + newFileVersion);
                    }).catch(function(err) {
                      res.set('Content-Type', 'text/html');
                      res.send(err);
                    });
                } else {
                  res.set('Content-Type', 'text/html');
                  res.send(err);
                }
              } else {
                var shaDir = versionPath.replace(config['staticFileCabinetDirectory'] + "FILES/", "");
                var shaParts = shaDir.split("/");
                shaParts.pop();
                var shasum = shaParts.join("");
                var shaCheckingProcess = spawn("shasum", ["-c", "-"]);
                var shaSumInput = shasum + "  " + existingFile + "\n";
                shaCheckingProcess.stdin.write(shaSumInput);
                shaCheckingProcess.stdin.end();
                shaCheckingProcess.stdout.pipe(es.split()).pipe(es.map(function (data, cb) {
                  var trimmedLine = data.trim();
                  if (0 != trimmedLine.length) {
                    if (trimmedLine.endsWith(': OK')) {
                      var contentType = (lookup(checkPath) || 'application/octet-stream');
                      res.set('Content-Type', contentType);
                      fs.readFile(checkPath, function (err, data) {
                        if (err) { throw err; }
                        res.send(data);
                      });
                    } else if (trimmedLine.endsWith(': FAILED')) {
                      promiseToCopyFile(existingFile, config['staticFileCabinetDirectory'], checkPath).then(function(newFileVersion) {
                        res.redirect(req.path + "?v=" + newFileVersion);
                      });
                    } else {
                      res.set('Content-Type', 'text/html');
                      res.send("UNKNOWN: " + trimmedLine);
                    }
                  }
                  cb();
                }));
                shaCheckingProcess.stderr.pipe(es.split()).pipe(es.map(function (data, cb) {
                  var trimmedLine = data.trim();
                  if (0 != trimmedLine.length) {
                    console.log("shasum error: " + trimmedLine);
                  }
                  cb();
                }));
              }
            });
          }
        });
      }).catch(function(err) {
        res.set('Content-Type', 'text/html');
        res.send(err);
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
.catch(function(err) {
  console.log(err);
});
