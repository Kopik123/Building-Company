const fs = require('fs');
const path = require('path');

const VERSIONED_EXTENSIONS = new Set([
  '.css',
  '.js',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.svg',
  '.ico'
]);

const createAssetVersion = () =>
  String(process.env.ASSET_VERSION || Date.now().toString(36));

const getUrlExtension = (value) => {
  try {
    const parsed = new URL(value, 'http://localhost');
    return String(path.extname(parsed.pathname) || '').toLowerCase();
  } catch {
    return '';
  }
};

const shouldVersionAssetUrl = (value) => {
  if (!value) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  return VERSIONED_EXTENSIONS.has(getUrlExtension(value));
};

const appendVersionParam = (value, assetVersion) => {
  if (!shouldVersionAssetUrl(value)) return value;

  const [base, hash = ''] = value.split('#');
  const separator = base.includes('?') ? '&' : '?';
  const next = `${base}${separator}v=${encodeURIComponent(assetVersion)}`;
  return hash ? `${next}#${hash}` : next;
};

const versionSrcset = (value, assetVersion) =>
  String(value)
    .split(',')
    .map((entry) => {
      const trimmed = entry.trim();
      if (!trimmed) return trimmed;
      const match = trimmed.match(/^(\S+)(\s+.+)?$/);
      if (!match) return trimmed;
      const [, url, descriptor = ''] = match;
      return `${appendVersionParam(url, assetVersion)}${descriptor}`;
    })
    .join(', ');

const versionHtmlAssetRefs = (html, assetVersion) =>
  String(html).replace(/\b(href|src|srcset)=(['"])([^'"]+)\2/g, (_match, attr, quote, value) => {
    const nextValue = attr === 'srcset'
      ? versionSrcset(value, assetVersion)
      : appendVersionParam(value, assetVersion);
    return `${attr}=${quote}${nextValue}${quote}`;
  });

const resolveHtmlFilePath = (rootDir, requestPath) => {
  const normalized = requestPath === '/' ? '/index.html' : requestPath;
  if (!normalized.endsWith('.html')) return null;

  const relativePath = normalized.replace(/^\/+/, '');
  const resolvedRoot = path.resolve(rootDir);
  const filePath = path.resolve(resolvedRoot, relativePath);

  if (filePath !== path.join(resolvedRoot, relativePath)) return null;
  return filePath;
};

const createVersionedHtmlMiddleware = ({ rootDir, assetVersion, cacheControl = 'no-store' }) =>
  (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      next();
      return;
    }

    const filePath = resolveHtmlFilePath(rootDir, req.path);
    if (!filePath) {
      next();
      return;
    }

    fs.readFile(filePath, 'utf8', (error, html) => {
      if (error) {
        if (error.code === 'ENOENT') {
          next();
          return;
        }
        next(error);
        return;
      }

      const body = versionHtmlAssetRefs(html, assetVersion);
      res.type('html');
      res.setHeader('Cache-Control', cacheControl);
      if (req.method === 'HEAD') {
        res.status(200).end();
        return;
      }
      res.send(body);
    });
  };

module.exports = {
  appendVersionParam,
  createAssetVersion,
  createVersionedHtmlMiddleware,
  versionHtmlAssetRefs
};
