const fs = require('fs');
const path = require('path');
const { Project, ProjectMedia } = require('../models');
const { galleryCache, getCached, setCached } = require('./publicCache');

const galleryFilesCacheTtlRaw = Number(process.env.GALLERY_CACHE_TTL_MS);
const GALLERY_FILES_CACHE_TTL_MS = Number.isFinite(galleryFilesCacheTtlRaw) && galleryFilesCacheTtlRaw > 0
  ? galleryFilesCacheTtlRaw
  : 60 * 1000;

const publicGalleryTtlRaw = Number(process.env.PUBLIC_GALLERY_CACHE_TTL_MS);
const PUBLIC_GALLERY_TTL_MS = Number.isFinite(publicGalleryTtlRaw) && publicGalleryTtlRaw > 0
  ? publicGalleryTtlRaw
  : 30 * 1000;

const MANAGED_GALLERY_CACHE_KEY = 'managed-projects';
const SERVICE_GALLERY_CACHE_KEY = 'service-folders';
const GALLERY_IMAGE_PATTERN = /\.(jpg|jpeg|png|gif|webp)$/i;
const GALLERY_IGNORED_FOLDERS = new Set(['premium']);
const GALLERY_SERVICE_ORDER = ['bathrooms', 'kitchens', 'interiors', 'exteriors', 'finishes'];

let galleryFilesCache = {
  galleryPath: '',
  images: null,
  expiresAt: 0
};

const getDateTokenFromFilename = (filename) => filename.match(/\d{8}/)?.[0] || '00000000';

const applyPublicGalleryCacheHeaders = (res, ttlMs = PUBLIC_GALLERY_TTL_MS) => {
  const maxAgeSeconds = Math.max(1, Math.floor(ttlMs / 1000));
  res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`);
};

const titleCase = (value) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const createPublicGalleryPath = (...parts) => `/${parts.map((part) => encodeURIComponent(String(part))).join('/')}`;

const mapServiceSortOrder = (serviceName) => {
  const index = GALLERY_SERVICE_ORDER.indexOf(serviceName);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

const labelFromFilename = (filename) => {
  const base = String(filename || '').replace(/\.[a-z0-9]+$/i, '');
  return titleCase(base);
};

const mapManagedGalleryProjects = (projects) =>
  projects
    .map((project) => {
      const images = (project.media || [])
        .filter((item) => item.mediaType === 'image' && item.showInGallery)
        .sort((a, b) => {
          if (a.isCover !== b.isCover) return Number(b.isCover) - Number(a.isCover);
          if (a.galleryOrder !== b.galleryOrder) return a.galleryOrder - b.galleryOrder;
          return String(a.filename || '').localeCompare(String(b.filename || ''));
        })
        .map((item) => item.url);

      return {
        id: project.id,
        name: project.title,
        location: project.location || null,
        images
      };
    })
    .filter((project) => project.images.length);

const fetchManagedGalleryProjects = async () => {
  const projects = await Project.findAll({
    where: {
      showInGallery: true,
      isActive: true
    },
    attributes: ['id', 'title', 'location'],
    include: [
      {
        model: ProjectMedia,
        as: 'media',
        attributes: ['url', 'mediaType', 'showInGallery', 'isCover', 'galleryOrder', 'filename'],
        where: {
          mediaType: 'image',
          showInGallery: true
        },
        required: false
      }
    ],
    order: [['galleryOrder', 'ASC'], ['createdAt', 'DESC']]
  });

  return mapManagedGalleryProjects(projects);
};

const fetchManagedGalleryProjectsCached = async () => {
  const cached = getCached(galleryCache, MANAGED_GALLERY_CACHE_KEY);
  if (cached) {
    return {
      payload: cached,
      cacheStatus: 'HIT'
    };
  }

  const payload = {
    projects: await fetchManagedGalleryProjects()
  };
  setCached(galleryCache, MANAGED_GALLERY_CACHE_KEY, payload, PUBLIC_GALLERY_TTL_MS);

  return {
    payload,
    cacheStatus: 'MISS'
  };
};

const fetchServiceGalleryFolders = async (galleryPath) => {
  const entries = await fs.promises.readdir(galleryPath, { withFileTypes: true });
  const serviceFolders = entries
    .filter((entry) => entry.isDirectory() && !GALLERY_IGNORED_FOLDERS.has(entry.name))
    .sort((a, b) => {
      const orderDelta = mapServiceSortOrder(a.name) - mapServiceSortOrder(b.name);
      if (orderDelta !== 0) return orderDelta;
      return a.name.localeCompare(b.name);
    });

  const services = [];

  for (const folder of serviceFolders) {
    const folderPath = path.join(galleryPath, folder.name);
    const files = await fs.promises.readdir(folderPath);
    const images = files
      .filter((file) => GALLERY_IMAGE_PATTERN.test(file))
      .sort((a, b) => a.localeCompare(b))
      .map((file) => ({
        src: createPublicGalleryPath(path.basename(galleryPath), folder.name, file),
        label: labelFromFilename(file)
      }));

    if (!images.length) continue;

    services.push({
      id: folder.name,
      name: titleCase(folder.name),
      images
    });
  }

  return services;
};

const fetchServiceGalleryFoldersCached = async (galleryPath) => {
  const cacheKey = `${SERVICE_GALLERY_CACHE_KEY}:${galleryPath}`;
  const cached = getCached(galleryCache, cacheKey);
  if (cached) {
    return {
      payload: cached,
      cacheStatus: 'HIT'
    };
  }

  const payload = {
    services: await fetchServiceGalleryFolders(galleryPath)
  };
  setCached(galleryCache, cacheKey, payload, GALLERY_FILES_CACHE_TTL_MS);

  return {
    payload,
    cacheStatus: 'MISS'
  };
};

const fetchGalleryFolderImages = async (galleryPath) => {
  const now = Date.now();
  if (
    galleryFilesCache.images
    && galleryFilesCache.galleryPath === galleryPath
    && now < galleryFilesCache.expiresAt
  ) {
    return galleryFilesCache.images;
  }

  const files = await fs.promises.readdir(galleryPath);
  const images = files
    .filter((file) => GALLERY_IMAGE_PATTERN.test(file))
    .sort((a, b) => getDateTokenFromFilename(b).localeCompare(getDateTokenFromFilename(a)));

  galleryFilesCache = {
    galleryPath,
    images,
    expiresAt: now + GALLERY_FILES_CACHE_TTL_MS
  };

  return images;
};

module.exports = {
  GALLERY_FILES_CACHE_TTL_MS,
  applyPublicGalleryCacheHeaders,
  fetchGalleryFolderImages,
  fetchManagedGalleryProjectsCached,
  fetchServiceGalleryFoldersCached,
};
