const { AsyncLocalStorage } = require('async_hooks');

// A dependency-free store so both the logger and the request-context middleware
// can share the current request's metadata (e.g. requestId) without importing
// each other (prevents circular requires).
const storage = new AsyncLocalStorage();

// Run `callback` with a fresh context object bound to the current async chain.
const runWithContext = (context, callback) => storage.run(context, callback);

// Get the whole context (or undefined when called outside a request).
const getContext = () => storage.getStore();

// Convenience getter for the correlation id.
const getRequestId = () => {
  const store = storage.getStore();
  return store ? store.requestId : undefined;
};

module.exports = {
  storage,
  runWithContext,
  getContext,
  getRequestId
};
