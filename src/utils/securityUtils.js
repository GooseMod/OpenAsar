"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.saferShellOpenExternal = saferShellOpenExternal;
exports.checkUrlOriginMatches = checkUrlOriginMatches;

var _electron = require("electron");

var _url = _interopRequireDefault(require("url"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const BLOCKED_URL_PROTOCOLS = ['file:', 'javascript:', 'vbscript:', 'data:', 'about:', 'chrome:', 'ms-cxh:', 'ms-cxh-full:', 'ms-word:'];

function saferShellOpenExternal(externalUrl) {
  let parsedUrl;

  try {
    parsedUrl = _url.default.parse(externalUrl);
  } catch (_) {
    return Promise.reject();
  }

  if (parsedUrl.protocol == null || BLOCKED_URL_PROTOCOLS.includes(parsedUrl.protocol.toLowerCase())) {
    return Promise.reject();
  }

  return _electron.shell.openExternal(externalUrl);
}

function checkUrlOriginMatches(urlA, urlB) {
  let parsedUrlA;
  let parsedUrlB;

  try {
    parsedUrlA = _url.default.parse(urlA);
    parsedUrlB = _url.default.parse(urlB);
  } catch (_) {
    return false;
  }

  return parsedUrlA.protocol === parsedUrlB.protocol && parsedUrlA.slashes === parsedUrlB.slashes && parsedUrlA.host === parsedUrlB.host;
}