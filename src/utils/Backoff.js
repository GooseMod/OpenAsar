class Backoff { // Heavily based on original for compat
  /**
   * Create a backoff instance can automatically backoff retries.
   */
  constructor(min = 500, max = null, jitter = true) {
    this.min = min;
    this.max = max != null ? max : min * 10;
    this.jitter = jitter;
    this._current = min;
    this._timeoutId = null;
    this._fails = 0;
  }
  /**
   * Return the number of failures.
   */


  get fails() {
    return this._fails;
  }
  /**
   * Current backoff value in milliseconds.
   */


  get current() {
    return this._current;
  }
  /**
   * A callback is going to fire.
   */


  get pending() {
    return this._timeoutId != null;
  }
  /**
   * Clear any pending callbacks and reset the backoff.
   */


  succeed() {
    this.cancel();
    this._fails = 0;
    this._current = this.min;
  }
  /**
   * Increment the backoff and schedule a callback if provided.
   */


  fail(callback) {
    this._fails += 1;
    let delay = this._current * 2;

    if (this.jitter) {
      delay *= Math.random();
    }

    this._current = Math.min(this._current + delay, this.max);

    if (callback != null) {
      if (this._timeoutId != null) {
        throw new Error('callback already pending');
      }

      this._timeoutId = setTimeout(() => {
        try {
          if (callback != null) {
            callback();
          }
        } finally {
          this._timeoutId = null;
        }
      }, this._current);
    }

    return this._current;
  }
  /**
   *  Clear any pending callbacks.
   */


  cancel() {
    if (this._timeoutId != null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

}

module.exports = Backoff;