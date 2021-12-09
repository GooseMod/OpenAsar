const log = require('./log');

module.exports = (debugName) => {
  return new Proxy({}, {
    get(target, prop, receiver) {
      log('Stub', `${debugName}: Tried getting ${prop}`);
    },

    set(target, prop, value, receiver) {
      log('Stub', `${debugName}: Tried setting ${prop}, ${value}`);
    }
  });
};