const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
};

const DEFAULT_CACHE_MAX_ENTRIES = toPositiveInt(process.env.PUBLIC_CACHE_MAX_ENTRIES, 200);
const cacheLimits = new WeakMap();

const servicesCache = new Map();
const galleryCache = new Map();

cacheLimits.set(
  servicesCache,
  toPositiveInt(process.env.PUBLIC_SERVICES_CACHE_MAX_ENTRIES, DEFAULT_CACHE_MAX_ENTRIES)
);
cacheLimits.set(
  galleryCache,
  toPositiveInt(process.env.PUBLIC_GALLERY_CACHE_MAX_ENTRIES, DEFAULT_CACHE_MAX_ENTRIES)
);

const getCacheLimit = (cache) => cacheLimits.get(cache) || DEFAULT_CACHE_MAX_ENTRIES;

const pruneExpired = (cache, now) => {
  for (const [key, entry] of cache.entries()) {
    if (!entry || now >= entry.expiresAt) {
      cache.delete(key);
    }
  }
};

const ensureCapacity = (cache, now) => {
  const maxEntries = getCacheLimit(cache);
  if (cache.size < maxEntries) return;

  pruneExpired(cache, now);
  while (cache.size >= maxEntries) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
};

const getCached = (cache, key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.payload;
};

const setCached = (cache, key, payload, ttlMs) => {
  const ttl = Number(ttlMs);
  if (!Number.isFinite(ttl) || ttl <= 0) {
    cache.delete(key);
    return;
  }

  const now = Date.now();
  ensureCapacity(cache, now);
  cache.set(key, {
    payload,
    expiresAt: now + ttl
  });
};

const clearServicesCache = () => {
  servicesCache.clear();
};

const clearGalleryCache = () => {
  galleryCache.clear();
};

const clearPublicCaches = () => {
  clearServicesCache();
  clearGalleryCache();
};

module.exports = {
  servicesCache,
  galleryCache,
  getCached,
  setCached,
  clearServicesCache,
  clearGalleryCache,
  clearPublicCaches
};
