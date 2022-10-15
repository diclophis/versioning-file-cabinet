"use strict";


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
var marked = require('marked');
var React = require('react');
var ReactDOM = require('react-dom');
var ReactDOMServer = require('react-dom/server');
//var HTMLDocument = require('react-html-document');


//TODO: move all config into module
var webpackConfig = {
  //node: {
  //  console: true,
  //},
  entry: [ path.dirname(__filename) + "/client.js"],
  output: {
    path: '/',
    filename: "[name].js"
  },
  module: {
    rules: [
      //{ test: /\.css$/, loader: "style!css" }
      { test: /\.css$/, use: "css-loader" }
    ]
  }
}


var poppingConfig = null;
var config = {};
var mfs = new MemoryFS();
var compiler = webpack(webpackConfig);
compiler.outputFileSystem = mfs;


//TODO: also include argv processing in config module!
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
config['-h'] = config['-h'] || '0.0.0.0';
config['-c'] = null;
//config['publicDir'] = "public";

//var HTMLDocument = React.createClass({

class HTMLDocument extends React.Component {
  render() {
    var headEl = React.createElement("head", {key: 'head-el'});
    var bodyEl = React.createElement("body", {key: 'body-el'}, this.props.children);

    return (React.createElement("html", {}, [headEl, bodyEl]));
  }
}


//TODO: flesh out list of bad filenames
var isOkFilename = function(filename) {
  var isChromeMeta = filename.startsWith('.com.google.Chrome');
  var isChromeDownload = filename.endsWith('.crdownload');
  var isSwp = filename.endsWith('.swp');
  var isDotIndex = filename.endsWith('.index');
  return !(isChromeMeta
           || isChromeDownload
           || isSwp
           || isDotIndex);
};


//TODO: util modules
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


//TODO: abstract into promises tree
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


var promiseToGetListOfVersions = function(path) {
  return new Promise(function(resolve, reject) {
    fs.readdir(config['staticFileCabinetDirectory'] + "/VERSIONS/" + path, function(err, files) {
      if (err) { return reject(err); }
      resolve(files);
    });
  });
};


var promiseToSetResolvedFolderfilePath = function() {
  return new Promise(function(resolve, reject) {
    fs.realpath(config['-f'], function(err, fullFolderfilePath) {
      if (err) { return reject(err); }

      fs.readFile(fullFolderfilePath, "utf8", function(err, data) {
        if (err) { return reject(err); }

        var dataTrimmed = data.trim();
        config['resolvedFolerfileDirname'] = dataTrimmed;

        resolve(fullFolderfilePath);
      });
    });
  });
};


var promiseToCreateStaticFileCabinetDirectory = function() {
  return new Promise(function(resolve, reject) {
    config['staticFileCabinetDirectory'] = config['resolvedFolerfileDirname'] + "/.sfc/.index";
    config['staticFileCabinetDirectoryLatest'] = config['resolvedFolerfileDirname'] + "/.sfc";

    fs.access(config['staticFileCabinetDirectory'], fs.R_OK | fs.W_OK, function (err) {
      if (err) {
        var mkdirSfc = spawn("mkdir", ["-p", config['staticFileCabinetDirectory']]);

        mkdirSfc.stdout.on('close', function(err) {
          if (err) { return reject(err); }
          return resolve(config['staticFileCabinetDirectory']);
        });
      } else {
        return resolve(config['staticFileCabinetDirectory']);
      }
    });
  });
};


var promiseToWatchFilesFromFolders = function(allFiles, validDirsToWatch, sendFile) {
  var inspectFile = function(interestingFile) {
    return new Promise(function(resolve, reject) {
      if (!isOkFilename(interestingFile)) {
        return reject();
      }

      promiseToHandlePath(interestingFile, null).then(function(handledPathResult) {
        promiseToGetListOfVersions(interestingFile).then(function(allVersions) {
          sendFile(interestingFile, allVersions);
          resolve();
        }).catch(function(err) {
          console.log("error listing versions", err);
        });
      }).catch(function(err) {
        console.log("error handling file", err, interestingFile);
      });
    });
  };

  var foop = function(iallFiles) {
    var allP = [];
    iallFiles.forEach(function(interestingFile) {
      allP.push(inspectFile(interestingFile));
    });
    return Promise.all(allP);
  };

  return foop(allFiles).then(function() {
    validDirsToWatch.forEach(function(validDirAndTildeScape, index, array) {
      var tildeScape = validDirAndTildeScape[0];
      var validDir = validDirAndTildeScape[1];
      var waiter = false;

      fs.watch(validDir, function (fileEvent, filename) {
        if (waiter) {
          clearTimeout(waiter);
        }
        waiter = setTimeout(function() {
          promiseToListAllFilesToSync().then(function(allFiles) {
            foop(allFiles);
          }).catch(function(err) {
            console.log("cant list all files", err);
          });
        }, 2);
      });
    });
  });
};


var promiseToListFolderfilesToSync = function() {
  return new Promise(function(resolve, reject) {
    //fs.readFile(config['-f'], 'utf8', function (err, data) {
    //  if (err) { return reject(err); }
    //  return resolve(data.split("\n").filter(function(element, index, array) {
    //    return stringPresent(element)
    //  }).map(function(element) {
    //    element = element.replace("~", process.env.HOME);
    ///    var tildeScape = element.split("/").pop();
    ///    return [tildeScape, element];
    ///  }));
    ///});
    //resolve([[config['-f'], "bar"]]);
    //var tildeScape = folderToSyncAndTildeScape[0];
    //var folderToSync = folderToSyncAndTildeScape[1];

    /// this is a security / tenancy model
    resolve([[config['resolvedFolerfileDirname'], config['resolvedFolerfileDirname']]]);

    //  return resolve(
    //data.split("\n").filter(function(element, index, array) {
    //    return stringPresent(element)
    //  }).map(function(element) {
    //    element = element.replace("~", process.env.HOME);
    ///    var tildeScape = element.split("/").pop();
    ///    return [tildeScape, element];
    ///  }));
  });
};


var promiseToRenderIndexHtml = function() {
  return new Promise(function(resolve, reject) {
    var clientScript = React.createElement("script", {src: "?interfaceJavascript", key: "js"}, null);
    var versioningFileCabinetDiv = React.createElement("div", {id: "versioning-file-cabinet", key: "versioning-file-cabinet"}, null);
    var otherDiv = React.createElement("div", {key: "other-div"}, [versioningFileCabinetDiv, clientScript]);
    var indexDocument = React.createElement(HTMLDocument, {title: "versioning-file-cabinet"}, otherDiv);
    return resolve("<!DOCTYPE html>" + ReactDOMServer.renderToStaticMarkup(indexDocument));
  });
};


var promiseToListAllFilesToSync = function() {
  var allFilesToSync = [];
  var allFileListingProcessPromises = [];

  return promiseToListFolderfilesToSync().then(function(foldersToSync) {
    foldersToSync.forEach(function(folderToSyncAndTildeScape) {

      var tildeScape = folderToSyncAndTildeScape[0];
      var folderToSync = folderToSyncAndTildeScape[1];
      var folderToSyncPrefix = path.basename(folderToSync);

      var fileListingProcessPromise = new Promise(function(res, rej) {
        var findArgs = [folderToSync, "-path", config['staticFileCabinetDirectoryLatest'], "-prune", "-false", "-o", "-type", "f,l"];

        var fileListingProcess = spawn("find", findArgs);

        fileListingProcess.stdout.pipe(es.split()).pipe(es.map(function (data, cb) {
          if (stringPresent(data) && folderToSync != data) {
            var canonFile = folderToSyncPrefix + data.replace(folderToSync, '');
            allFilesToSync.push(canonFile);
          }

          cb(null);
        }));

        fileListingProcess.stdout.on('close', function(err) {
          if (err) { return rej(err); }
          return res();
        });
      });
      allFileListingProcessPromises.push(fileListingProcessPromise);
    });

    return Promise.all(allFileListingProcessPromises).then(function() {
      return Promise.resolve(allFilesToSync);
    });
  });
};


var promiseToCopyFile = function(source, sfcPath, sfcLatestPath, requested) {
  return new Promise(function(resolve, reject) {
    fs.readFile(source, function (err, data) {
      if (err) { return reject(err); }
      var checksumOfInboundFile = checksum(data, 'sha1');
      var splitDirPath = splitChars(checksumOfInboundFile, 8).join("/");
      var target = sfcPath + "/FILES/" + splitDirPath;
      var latestTar = sfcLatestPath;
      var versionsPath = sfcPath + "/VERSIONS/" + requested;
      var indexPath = "index" + path.extname(source);
      var mkdirAndCopyAndSymlink = "mkdir -p " + versionsPath + " && mkdir -p " + target + " && cp " + source + " " + target + "/" + indexPath + " && mkdir -p " + path.dirname(requested) + " " + path.dirname("/home/app/" + latestTar + "/" + requested) + " && export VERSION=$(echo " + splitDirPath + " | tr / -)" + " && ln -s /home/app/" + target + "/" + indexPath + " /home/app/" + versionsPath + "/$VERSION && ln -sf /home/app/" + versionsPath + "/$VERSION /home/app/" + latestTar + "/" + requested + " && echo $VERSION";

      console.log(mkdirAndCopyAndSymlink);

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


var promiseToHandlePath = function(pathToHandle, desiredVersion) {
  return new Promise(function(resolve, reject) {
    if (!isOkFilename(pathToHandle)) {
      return reject("invalid filename!!!!", pathToHandle);
    }

    var requestedTildeScape = ("/" + pathToHandle).split("/")[1];

    promiseToListFolderfilesToSync().then(function(foldersToSyncAndTildeScapes) {
      foldersToSyncAndTildeScapes.forEach(function(folderToSyncAndTildeScape) {

        var foundTildeScape = folderToSyncAndTildeScape[0];
        var folderToSync = folderToSyncAndTildeScape[1];

        if (foundTildeScape != requestedTildeScape) {
          console.log("FOOOOOOOOOOOOOOOOOOOOOOOOOOOO");
        } else {
          var checkPathFoo = pathToHandle;

          fs.realpath(config['staticFileCabinetDirectoryLatest'] + "/" + checkPathFoo, function(err, versionPath) {
            var existingFile = path.dirname(folderToSync) + "/" + pathToHandle;

            if (err) {
              if ('ENOENT' === err.code) {
                //TODO? should this event happen???

                //promiseToCopyFile(existingFile, config['staticFileCabinetDirectory'], checkPath).then(function(newFileVersion) {
                //  return resolve({resolution: "updated", version: newFileVersion});
                //})
                promiseToCopyFile(existingFile, config['staticFileCabinetDirectory'], config['staticFileCabinetDirectoryLatest'], checkPathFoo).then(function(newFileVersion) {
                  return resolve({resolution: "updated", version: newFileVersion});
                }).catch(function(err) {
                  return reject(err);
                });
              } else {
                return reject(err);
              }
            } else {
              var shaDir = versionPath.replace("/home/app/" + config['staticFileCabinetDirectory'] + "/FILES/", "");

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
                    var contentType = (lookup(checkPathFoo) || 'application/octet-stream');
                    var checkPathBop = null;

                    if (desiredVersion) {
                      checkPathBop = config['staticFileCabinetDirectory'] + "/VERSIONS/" + pathToHandle + "/" + desiredVersion;
                    } else {
                      checkPathBop = pathToHandle;
                    }

                    fs.readFile(checkPathBop, function (err, data) {
                      if (err) { console.log(err); return reject(err); }
                      switch(contentType) {
                        case 'text/markdown':
                        case 'text/x-markdown':
                          var htmlFromMarkdown = marked.parse(data.toString());
                          //var clientScript = React.createElement("script", {src: "?interfaceJavascript", key: "js"}, null);
                          var markdownDiv = React.createElement("div", {key: "markdown-container", dangerouslySetInnerHTML: {__html: htmlFromMarkdown}}, null);
                          var markdownHtml = React.createElement("div", {id: "markdown"}, [markdownDiv]);
                          var markdownDocument = React.createElement(HTMLDocument, {title: checkPathBop}, markdownHtml);

                          data = "<!DOCTYPE html>" + ReactDOMServer.renderToStaticMarkup(markdownDocument);
                          contentType = 'text/html';

                          break;
                        default:
                      }

                      return resolve({resolution: "up-to-date", data: data, contentType: contentType});
                    });
                  } else if (trimmedLine.endsWith(': FAILED')) {
                    promiseToCopyFile(existingFile, config['staticFileCabinetDirectory'], config['staticFileCabinetDirectoryLatest'], checkPathFoo).then(function(newFileVersion) {
                      return resolve({resolution: "updated", version: newFileVersion});
                    });
                    //TODO: ???
                    //promiseToCopyFile(existingFile, config['staticFileCabinetDirectory'], checkPath).then(function(newFileVersion) {
                    //  return resolve({resolution: "updated", version: newFileVersion});
                    //});
                  } else {
                    return reject(trimmedLine);
                  }
                }

                cb();

              }));

              shaCheckingProcess.stderr.pipe(es.split()).pipe(es.map(function (data, cb) {
                var trimmedLine = data.trim();
                if (0 != trimmedLine.length) {
                  //TODO???? console.log("shasum error: " + trimmedLine, checkPathFoo, existingFile, config['staticFileCabinetDirectory']);

                  /// ??? TODO???
                  //promiseToCopyFile(existingFile, config['staticFileCabinetDirectory'], config['staticFileCabinetDirectoryLatest'], checkPathFoo).then(function(newFileVersion) {
                  //  return resolve({resolution: "updated", version: newFileVersion});
                  //});
                }
                cb();
              }));
            }
          });
        }
      });
    })
  })
};


var vfcHandler = function(req, res, next) {
  promiseToHandlePath(req.path.substring(1, req.path.length), req.query.v).then(function(handledPathResult) {
    if ("updated" === handledPathResult.resolution) {

      res.set('Content-Type', 'text/html');
      return res.redirect(req.path + "?v=" + handledPathResult.version);

    } else if ("up-to-date" === handledPathResult.resolution) {

      res.set('Content-Type', handledPathResult.contentType);
      return res.send(handledPathResult.data);

    } else {

      res.set('Content-Type', 'text/html');
      return res.send("unknown resolution: " + handledPathResult.resolution);

    }
  }).catch(function(err) {
    res.set('Content-Type', 'text/html');
    return res.send(err);
  });
};


var promiseToListenForHttpRequests = function() {
  return new Promise(function(resolve, reject) {
    var app = express();
    app.use(function(req, res, next) {
      var isRoot = '/' === req.path;
      var isInterfaceJavascript = '' === req.query.interfaceJavascript;
      var redirectToIndexHtml = isRoot && app.get('env') != 'development' && !isInterfaceJavascript;
      var respondWithInterfaceHtml = isRoot && app.get('env') === 'development' && !isInterfaceJavascript;
      //console.log(isRoot, isInterfaceJavascript, redirectToIndexHtml, respondWithInterfaceHtml);
      if (redirectToIndexHtml) {
        res.redirect('/index.html');
      } else if (respondWithInterfaceHtml) {
        promiseToRenderIndexHtml().then(function(data) {
          res.set('Content-Type', 'text/html');
          res.send(data);
        }).catch(function(err) {
          res.set('Content-Type', 'text/plain');
          res.status(500);
          res.send(err);
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
      return res.status(404).send('Not Found');
    });

    app.get('/stream', function(req, res) {
      var messageCount = 0;
      var sendFile = (function(eventStreamResponse) {
        return function(filename, versions) {
          var stateOfFile = {
            path: filename,
            versions: versions
          };
          eventStreamResponse.write('id: ' + messageCount + '\n');
          eventStreamResponse.write("data: " + JSON.stringify(stateOfFile) + '\n\n'); // Note the extra newline
          messageCount = messageCount + 1;
        };
      })(res);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      res.write('\n');

      //TODO: !!!
      req.on("close", function() { });

      promiseToListAllFilesToSync().then(function(allFiles) {
        return promiseToListFolderfilesToSync().then(function(foldersToSync) {
          return promiseToWatchFilesFromFolders(allFiles, foldersToSync, sendFile);
        });
      });
    });

    app.use(vfcHandler);

    //app.use(express.static(path.dirname(config['-f']) + '/' + config['publicDir']));

    return resolve(app.listen(config['-p'], config['-h']));
  });
};


Promise.resolve()
.then(promiseToSetResolvedFolderfilePath)
.then(promiseToCreateStaticFileCabinetDirectory)
.then(promiseToListenForHttpRequests)
.catch(function(err) {
  console.log("global chain error:" + err);
});
