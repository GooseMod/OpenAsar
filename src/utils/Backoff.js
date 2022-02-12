module.exports = class Backoff { // Internal library / utility for a class to retry a callback with delays, etc.
  constructor(min = 500, max = (min * 10)) {
    Object.assign(this, { min, max });
    this.reset();
    
    this.pending = () => this._timeoutId != null; // If timeout currently set / waiting
  }

  fail(callback) { // On fail, wait and callback
    this.current = Math.min(this.current + (this.current * 2), this.max);

    this.fails++; // Bump fails

    if (!callback) return this.current; // No callback given, skip rest of this
    if (this._timeoutId != null) throw new Error(); // Timeout already set as waiting for another callback to call, throw error

    this._timeoutId = setTimeout(() => { // Set new timeout
      try {
        callback(); // Run callback
      } finally {
        this._timeoutId = null; // Stop tracking timeout internally as it's been executed
      }
    }, this.current);

    return this.current;
  }

  succeed() { // Reset and cancel
    this.reset();
    this.cancel();
  }

  cancel() { // Cancel current timeout
    this._timeoutId = clearTimeout(this._timeoutId); // Stop timeout
  }

  reset() { // Reset internal state
    this.current = this.min;
    this.fails = 0;
  }
};