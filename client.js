var React = require('react');
var ReactDOM = require('react-dom');
var ReactUpdate = require('react-addons-update');


var bindFilesystemEventInterface = function(reactComp) {
  var inFrame = (window.self !== window.top);
  if (!inFrame) {
    var resourceFrame = null;
    var preloadedSrc = "about:blank";


    var source = new EventSource("/stream");
    source.addEventListener("message", function(e) {
      var fileState = JSON.parse(e.data);
      var setFileState = {};
      reactComp.state.files[fileState.path] = reactComp.state.files[fileState.path] || {};
      setFileState[fileState.path] = { $merge: fileState };
      var newState = ReactUpdate(reactComp.state.files, setFileState);
      reactComp.setState({files: newState});
    }, false);
  }
};


var Client = React.createClass({
  getInitialState: function() {
    //TODO: !!!!
    var preloadedSrc = window.location.search;
    preloadedSrc = preloadedSrc.replace("#", "");
    preloadedSrc = preloadedSrc.replace("?", "");
    return {
      resourceFrameSrc: preloadedSrc.length > 0 ? preloadedSrc : null,
      files: {},
      selectedVersions: {},
      onResourceClicked: this.onResourceClicked,
      onVersionChanged: this.onVersionChanged
    };
  },
  componentWillMount: function() {
    bindFilesystemEventInterface(this);
    //TODO: !!!!
    //console.log('!@#!@#!@#');
    window.onpopstate = function(event) {
      //if (event.state && event.state.frame) {
      //  console.log("POPPP", event.state.frame);
      //  this.setState({resourceFrameSrc: event.state.frame});
      //}
    }.bind(this);
    window.onhashchange = function(event) {
      //console.log(event.newURL, event);
      //this.setState({resourceFrameSrc: window.location.hash.replace("#", "")});
    }.bind(this);
  },
  onResourceClicked: function(ev) {
    //ev.preventDefault();
    //this.setState({resourceFrameSrc: ev.target.dataset.filename});
    //this.onKeepHistorySynced(ev.target.dataset.filename);
  },
  onVersionChanged: function(ev) {
    var setList = {};
    setList[ev.target.dataset.filename] = ev.target.value;
    var nestedSet = { $merge: setList }
    var newState = ReactUpdate(this.state, {
      selectedVersions: nestedSet
    });
    this.setState(newState);
  },
  onKeepHistorySynced: function(intendedResource) {
    //history.pushState({frame: intendedResource}, intendedResource, null);
    //console.log(intendedResource);
    //window.location.hash = intendedResource;
  },
  render: function() {
    var resourceLinks = [];
    var filenames = Object.keys(this.state.files);
    filenames.sort().forEach(function(filename) {
      var versionInputs = [];
      var link = React.createElement("a", {key: filename, "data-filename": filename, href: "?" + filename, onClick: this.onResourceClicked}, filename);
      versionInputs.push(link);
      var selectedIndex = this.state.selectedVersions[filename] || this.state.files[filename].versions[(this.state.files[filename].versions.length - 1)];
      this.state.files[filename].versions.forEach(function(version) {
        var versionInput = React.createElement("input", {onMouseOver: this.onVersionChanged, onChange: this.onVersionChanged, "data-filename": filename, key: version, type: "radio", value: version, checked: selectedIndex === version}, null);
        versionInputs.push(versionInput);
      }.bind(this));
      var resourceLink = React.createElement("p", {key: filename},
        versionInputs
      );
      resourceLinks.push(resourceLink);
    }.bind(this));
    if (this.state.resourceFrameSrc && this.state.files[this.state.resourceFrameSrc]) {
      var resourceFrame = React.createElement("iframe", {key: "resource-frame", src: this.state.resourceFrameSrc + "?v=" + (this.state.selectedVersions[this.state.resourceFrameSrc] || this.state.files[this.state.resourceFrameSrc].versions[(this.state.files[this.state.resourceFrameSrc].versions.length - 1)])});
      resourceLinks.push(resourceFrame);
    }
    return React.createElement("div", null, resourceLinks);
  }
});


ReactDOM.render(React.createElement(Client), document.getElementById("app"));
require("./style.css");
