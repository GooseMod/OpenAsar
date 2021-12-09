"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spawn = spawn;
exports.spawnReg = spawnReg;
exports.addToRegistry = addToRegistry;

var _child_process = _interopRequireDefault(require("child_process"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const regExe = process.env.SystemRoot ? _path.default.join(process.env.SystemRoot, 'System32', 'reg.exe') : 'reg.exe'; // Spawn a command and invoke the callback when it completes with an error
// and the output from standard out.

function spawn(command, args, callback) {
  let stdout = '';
  let spawnedProcess;

  try {
    // TODO: contrary to below, it should not throw any error
    spawnedProcess = _child_process.default.spawn(command, args);
  } catch (err) {
    // Spawn can throw an error
    process.nextTick(() => {
      if (callback != null) {
        callback(err, stdout);
      }
    });
    return;
  } // TODO: we need to specify the encoding for the data if we're going to concat it as a string


  spawnedProcess.stdout.on('data', data => {
    stdout += data;
  });
  let err = null; // TODO: close event might not get called, we should
  //       callback on error https://nodejs.org/api/child_process.html#child_process_event_error

  spawnedProcess.on('error', err => {
    // TODO: there should always be an error
    if (err != null) {
      err = err;
    }
  }); // TODO: don't listen to close, but listen to exit instead

  spawnedProcess.on('close', (code, signal) => {
    if (err === null && code !== 0) {
      err = new Error('Command failed: ' + (signal || code));
    }

    if (err != null) {
      err.code = err.code || code;
      err.stdout = err.stdout || stdout;
    }

    if (callback != null) {
      callback(err, stdout);
    }
  });
} // Spawn reg.exe and callback when it completes


function spawnReg(args, callback) {
  return spawn(regExe, args, callback);
} // TODO: since we're doing this one by one, we could have a more graceful way of processing the queue
//       rather than mutating the array


function addToRegistry(queue, callback) {
  if (queue.length === 0) {
    return callback && callback();
  }

  const args = queue.shift();
  args.unshift('add');
  args.push('/f');
  return spawnReg(args, () => addToRegistry(queue, callback));
}