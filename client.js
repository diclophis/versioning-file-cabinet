var React = require('react');
var ReactDOM = require('react-dom');
var ReactUpdate = require('react-addons-update');


var bindFilesystemEventInterface = function(reactComp) {
  var inFrame = (window.self !== window.top);
  if (!inFrame) {
    var resourceFrame = null;
    var preloadedSrc = "about:blank";

    //window.onpopstate = function(event) {
    //  resourceFrame.src = event.state.frame;
    //};
    //window.addEventListener('load', function() {

    var source = new EventSource("/stream");
    source.addEventListener("message", function(e) {
      var fileState = JSON.parse(e.data);
      //console.log(fileState);

      var setFileState = {};
      reactComp.state.files[fileState.path] = reactComp.state.files[fileState.path] || {};
      setFileState[fileState.path] = { $merge: fileState }; //versions: { $set: fileState.versions } };
      var newState = ReactUpdate(reactComp.state.files, setFileState);
      //console.log(newState);
      reactComp.setState({files: newState});
    }, false);
  }
};


var Client = React.createClass({
  getInitialState: function() {
    return {
      resourceFrameSrc: null,
      files: {},
      selectedVersions: {},
      onResourceClicked: this.onResourceClicked
    };
  },
  componentWillMount: function() {
    bindFilesystemEventInterface(this);
  },
  onResourceClicked: function(ev) {
    ev.preventDefault();
    this.setState({resourceFrameSrc: ev.target.href});
    //resourceFrame.src = ev.target.href;
    //history.pushState({frame: resourceFrame.src}, window.title, "?" + ev.target.innerText);
    //linkToFile.addEventListener('click', onResourceClicked);
    //if (reloadTimeout) {
    //  clearTimeout(reloadTimeout);
    //}
    //reloadTimeout = setTimeout(function() {
    //  if (true === preloaded) {
    //    resourceFrame.src += '';
    //  }
    //}, 66);
  },
  render: function() {
    var resourceLinks = [];
    var filenames = Object.keys(this.state.files);
    filenames.forEach(function(filename) {
      var versionInputs = [];
      var link = React.createElement("a", {key: filename, href: filename, onClick: this.onResourceClicked}, filename);
      versionInputs.push(link);
      this.state.files[filename].versions.forEach(function(version) {
        var versionInput = React.createElement("input", {key: version, type: "radio", value: version}, null);
        versionInputs.push(versionInput);
      });

      var resourceLink = React.createElement("p", {key: filename},
        versionInputs
      );
      resourceLinks.push(resourceLink);
    }.bind(this));
    var resourceFrame = React.createElement("iframe", {src: this.state.resourceFrameSrc});
    resourceLinks.push(resourceFrame);
    return React.createElement("div", null, resourceLinks);
  }
});


ReactDOM.render(React.createElement(Client), document.getElementById("index"));
require("./style.css");

      //resourceFrame = document.createElement("iframe");
      //document.body.appendChild(resourceFrame);

      /*
      var preloadedSrc = window.location.href;
      preloadedSrc = preloadedSrc.replace("?", "");
      var reloadTimeout = null;
      var preloaded = false;
      resourceFrame.src = preloadedSrc;
      resourceFrame.addEventListener('load', function() {
        preloaded = true;
      });
      */
