"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _electron = require("electron");

var _querystring = _interopRequireDefault(require("querystring"));

var _request = _interopRequireDefault(require("request"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const DEFAULT_REQUEST_TIMEOUT = 30000;

function makeHTTPResponse({
  method,
  url,
  headers,
  statusCode,
  statusMessage
}, body) {
  return {
    method,
    url,
    headers,
    statusCode,
    statusMessage,
    body
  };
}

function makeHTTPStatusError(response) {
  const err = new Error(`HTTP Error: Status Code ${response.statusCode}`);
  err.response = response;
  return err;
}

function handleHTTPResponse(resolve, reject, response, stream) {
  const totalBytes = parseInt(response.headers['content-length'] || 1, 10);
  let receivedBytes = 0;
  const chunks = []; // don't stream response if it's a failure

  if (response.statusCode >= 300) {
    stream = null;
  }

  response.on('data', chunk => {
    if (stream != null) {
      receivedBytes += chunk.length;
      stream.write(chunk);
      stream.emit('progress', {
        totalBytes,
        receivedBytes
      });
      return;
    }

    chunks.push(chunk);
  });
  response.on('end', () => {
    if (stream != null) {
      stream.on('finish', () => resolve(makeHTTPResponse(response, null)));
      stream.end();
      return;
    }

    const res = makeHTTPResponse(response, Buffer.concat(chunks));

    if (res.statusCode >= 300) {
      reject(makeHTTPStatusError(res));
      return;
    }

    resolve(res);
  });
}

function nodeRequest({
  method,
  url,
  headers,
  qs,
  timeout,
  body,
  stream
}) {
  return new Promise((resolve, reject) => {
    const req = (0, _request.default)({
      method,
      url,
      qs,
      headers,
      followAllRedirects: true,
      encoding: null,
      timeout: timeout != null ? timeout : DEFAULT_REQUEST_TIMEOUT,
      body
    });
    req.on('response', response => handleHTTPResponse(resolve, reject, response, stream));
    req.on('error', err => reject(err));
  });
}

async function electronRequest({
  method,
  url,
  headers,
  qs,
  timeout,
  body,
  stream
}) {
  await _electron.app.whenReady();

  const {
    net,
    session
  } = require('electron');

  const req = net.request({
    method,
    url: `${url}${qs != null ? `?${_querystring.default.stringify(qs)}` : ''}`,
    redirect: 'follow',
    session: session.defaultSession
  });

  if (headers != null) {
    for (const headerKey of Object.keys(headers)) {
      req.setHeader(headerKey, headers[headerKey]);
    }
  }

  if (body != null) {
    req.write(body, 'utf-8');
  }

  return new Promise((resolve, reject) => {
    const reqTimeout = setTimeout(() => {
      req.abort();
      reject(new Error(`network timeout: ${url}`));
    }, timeout != null ? timeout : DEFAULT_REQUEST_TIMEOUT);
    req.on('login', (authInfo, callback) => callback());
    req.on('response', response => {
      clearTimeout(reqTimeout);
      handleHTTPResponse(resolve, reject, response, stream);
    });
    req.on('error', err => {
      clearTimeout(reqTimeout);
      reject(err);
    });
    req.end();
  });
}

async function requestWithMethod(method, options) {
  if (typeof options === 'string') {
    options = {
      url: options
    };
  }

  options = { ...options,
    method
  };

  try {
    return await electronRequest(options);
  } catch (err) {
    console.log(`Error downloading with electron net: ${err.message}`);
    console.log('Falling back to node net library..');
  }

  return nodeRequest(options);
} // only supports get for now, since retrying is non-idempotent and
// we'd want to grovel the errors to make sure it's safe to retry


for (const method of ['get']) {
  requestWithMethod[method] = requestWithMethod.bind(null, method.toUpperCase());
}

var _default = requestWithMethod;
exports.default = _default;
module.exports = exports.default;