var React = require('react');
var ReactDOM = require('react-dom');

var createClientInterface = function() {
  var inFrame = (window.self !== window.top);
  if (!inFrame) {
    var resourceFrame = null;
    var preloadedSrc = "about:blank";
    window.onpopstate = function(event) {
      resourceFrame.src = event.state.frame;
    };
    var onResourceClicked = function(ev) {
      ev.preventDefault();
      resourceFrame.src = ev.target.href;
      history.pushState({frame: resourceFrame.src}, window.title, "?" + ev.target.innerText);
    };
    window.addEventListener('load', function() {
      resourceFrame = document.createElement("iframe");
      document.body.appendChild(resourceFrame);
      var preloadedSrc = window.location.href;
      preloadedSrc = preloadedSrc.replace("?", "");
      var reloadTimeout = null;
      var preloaded = false;
      resourceFrame.src = preloadedSrc;
      resourceFrame.addEventListener('load', function() {
        preloaded = true;
      });
      var source = new EventSource("/stream");
      source.addEventListener("message", function(e){
        var linkToFilePara = document.createElement('p');
        var linkToFile = document.createElement('a');
        linkToFile.addEventListener('click', onResourceClicked);
        if (reloadTimeout) {
          clearTimeout(reloadTimeout);
        }
        reloadTimeout = setTimeout(function() {
          if (true === preloaded) {
            resourceFrame.src += '';
          }
        }, 66);
        var href = e.data;
        linkToFile.href = href;
        linkToFile.textContent = href;
        linkToFilePara.appendChild(linkToFile);
        document.body.appendChild(linkToFilePara);
      }, false);
    });
  }
};

createClientInterface();

var Client = React.createClass({
  render: function() {
    return React.createElement("div", null, "Hello");
  }
});


ReactDOM.render(React.createElement(Client), document.getElementById("index"));
