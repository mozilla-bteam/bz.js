export var XMLHttpRequest = null;

if (typeof window === 'undefined') {
  // we're not in a browser?
  let _loader = require;
  try {
    XMLHttpRequest = _loader('sdk/net/xhr').XMLHttpRequest;
  } catch(e) {
    XMLHttpRequest = _loader("xmlhttprequest").XMLHttpRequest;
  }
}
else if(typeof window !== 'undefined' && typeof window.XMLHttpRequest !== 'undefined') {
  XMLHttpRequest = window.XMLHttpRequest;
}
else {
  throw "No window, WAT."
}

