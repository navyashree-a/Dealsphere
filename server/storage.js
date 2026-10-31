// Small key-value storage used by the backend: Cloudflare KV in production,
// memory on the local dev server and in tests. Values are JSON.
// ttlSeconds: how long to keep the value; omit it to keep it until deleted.

export const kvStore = (kv) => ({
  get: async (key) => {
    const value = await kv.get(key);
    return value ? JSON.parse(value) : null;
  },
  // KV needs an expiry at least 60 seconds ahead.
  put: (key, value, ttlSeconds) =>
    kv.put(key, JSON.stringify(value), ttlSeconds ? { expirationTtl: Math.max(60, Math.ceil(ttlSeconds)) } : undefined),
  delete: (key) => kv.delete(key),
});

export const memoryStore = () => {
  const map = new Map();
  return {
    get: async (key) => {
      const item = map.get(key);
      if (!item || item.until < Date.now()) return null;
      return item.value;
    },
    put: async (key, value, ttlSeconds) => {
      map.set(key, { value, until: ttlSeconds ? Date.now() + Math.max(60, ttlSeconds) * 1000 : Infinity });
    },
    delete: async (key) => {
      map.delete(key);
    },
  };
};
