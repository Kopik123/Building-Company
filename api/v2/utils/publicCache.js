const servicesCache = new Map();
const galleryCache = new Map();

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
  cache.set(key, {
    payload,
    expiresAt: Date.now() + ttlMs
  });
};

const clearServicesCache = () => {
  servicesCache.clear();
};

const clearGalleryCache = () => {
  galleryCache.clear();
};

module.exports = {
  servicesCache,
  galleryCache,
  getCached,
  setCached,
  clearServicesCache,
  clearGalleryCache
};
