const fs = require('node:fs');
const path = require('node:path');

const GALLERY_IMAGE_PATTERN = /\.(jpg|jpeg|png|gif|webp)$/i;
const GALLERY_IGNORED_FOLDERS = new Set(['premium']);

const sortAlpha = (left, right) =>
  String(left || '').localeCompare(String(right || ''), undefined, {
    sensitivity: 'base',
    numeric: true
  });

const titleCase = (value) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const createPublicGalleryPath = (...parts) => `/${parts.map((part) => encodeURIComponent(String(part))).join('/')}`;

const labelFromFilename = (filename) => {
  const base = String(filename || '').replace(/\.[a-z0-9]+$/i, '');
  return titleCase(base);
};

const normalizeFolderEntries = (entries) =>
  entries
    .filter((entry) => entry.isDirectory() && !GALLERY_IGNORED_FOLDERS.has(entry.name))
    .sort((left, right) => sortAlpha(left.name, right.name));

const mapFolderImages = (files, galleryDirName, folderName) =>
  files
    .filter((file) => GALLERY_IMAGE_PATTERN.test(file))
    .sort(sortAlpha)
    .map((file) => ({
      src: createPublicGalleryPath(galleryDirName, folderName, file),
      label: labelFromFilename(file)
    }));

const buildFolderGalleryProjectsFromEntries = (entries, readFiles, galleryDirName) =>
  normalizeFolderEntries(entries)
    .map((folder) => {
      const images = mapFolderImages(readFiles(folder), galleryDirName, folder.name);
      if (!images.length) return null;
      return {
        id: folder.name,
        name: folder.name,
        images
      };
    })
    .filter(Boolean);

const readFolderGalleryProjects = async (galleryPath, { galleryDirName = path.basename(galleryPath) } = {}) => {
  const entries = await fs.promises.readdir(galleryPath, { withFileTypes: true });
  const services = [];

  for (const folder of normalizeFolderEntries(entries)) {
    const files = await fs.promises.readdir(path.join(galleryPath, folder.name));
    const images = mapFolderImages(files, galleryDirName, folder.name);
    if (!images.length) continue;
    services.push({
      id: folder.name,
      name: folder.name,
      images
    });
  }

  return services;
};

const readFolderGalleryProjectsSync = (galleryPath, { galleryDirName = path.basename(galleryPath) } = {}) => {
  const entries = fs.readdirSync(galleryPath, { withFileTypes: true });

  return buildFolderGalleryProjectsFromEntries(
    entries,
    (folder) => fs.readdirSync(path.join(galleryPath, folder.name)),
    galleryDirName
  );
};

module.exports = {
  createPublicGalleryPath,
  labelFromFilename,
  readFolderGalleryProjects,
  readFolderGalleryProjectsSync,
  sortAlpha
};
