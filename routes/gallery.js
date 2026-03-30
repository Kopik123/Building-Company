const express = require('express');
const {
  GALLERY_FILES_CACHE_TTL_MS,
  applyPublicGalleryCacheHeaders,
  fetchGalleryFolderImages,
  fetchManagedGalleryProjectsCached,
  fetchServiceGalleryFoldersCached
} = require('../utils/publicGallery');

const createLegacyGalleryRouter = ({ galleryPath }) => {
  const router = express.Router();

  router.get('/projects', async (req, res) => {
    try {
      const { payload, cacheStatus } = await fetchManagedGalleryProjectsCached();
      applyPublicGalleryCacheHeaders(res);
      res.set('X-Cache', cacheStatus);
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load gallery projects' });
    }
  });

  router.get('/services', async (_req, res) => {
    try {
      const { payload, cacheStatus } = await fetchServiceGalleryFoldersCached(galleryPath);
      applyPublicGalleryCacheHeaders(res, GALLERY_FILES_CACHE_TTL_MS);
      res.set('X-Cache', cacheStatus);
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load gallery services' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const { payload } = await fetchManagedGalleryProjectsCached();
      const managedProjects = payload.projects;
      if (managedProjects.length) {
        applyPublicGalleryCacheHeaders(res);
        return res.json({ images: managedProjects.flatMap((project) => project.images), projects: managedProjects });
      }

      const imageFiles = await fetchGalleryFolderImages(galleryPath);
      applyPublicGalleryCacheHeaders(res, GALLERY_FILES_CACHE_TTL_MS);
      return res.json({ images: imageFiles, projects: [] });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to read gallery folder' });
    }
  });

  return router;
};

module.exports = createLegacyGalleryRouter;
