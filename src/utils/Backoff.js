module.exports = class Backoff { // Internal library / utility for a class to retry a callback with delays, etc.
  constructor(min = 500, max = null) {
    this._timeoutId = null; // Setup internal vars
    this.fails = 0;

    this.min = min; // Setup args
    this.max = max ?? (min * 10);

    this.current = min;
  }

  get pending() { // If timeout currently set / waiting
    return this._timeoutId !== null;
  }

  succeed() { // Reset state on succeed
    this.current = this.min;
    this.fails = 0;

    this.cancel();
  }

  fail(callback) { // On fail, wait and callback
    const delay = this.current * 2;

    this.current = Math.min(this.current + delay, this.max);

    this.fails += 1; // Bump fails

    if (!callback) return this.current; // No callback given, skip rest of this
    if (this._timeoutId !== null) throw new Error('Callback already pending call'); // Timeout already set as waiting for another callback to call, throw error

    this._timeoutId = setTimeout(() => { // Set new timeout
      try {
        callback(); // Run callback
      } finally {
        this_timeoutId = null; // Stop tracking timeout internally as it's been executed
      }
    }, this.current);

    return this.current;
  }

  cancel() { // Cancel current timeout
    if (this._timeoutId === null) return; // If no timeout already, do nothing

    clearTimeout(this._timeoutId); // Stop timeout
    this_timeoutId = null; // Stop tracking timeout internally as it's been executed
  }
};