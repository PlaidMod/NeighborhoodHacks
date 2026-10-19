// Unit tests must never reach the network. Live checks belong in a separate config.
globalThis.fetch = (() => Promise.reject(new Error('Network is disabled in unit tests'))) as typeof fetch
