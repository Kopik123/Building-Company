const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { brandAssets, galleryAssets } = require('./asset-optimization.config');

const ensureDir = async (filePath) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
};

const toPublicPath = (filePath) =>
  `/${path.relative(path.join(__dirname, '..'), filePath)
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;

const withWidthSuffix = (basePath, width) => `${basePath}-${width}`;

const metadataCache = new Map();
const forceOptimize = ['1', 'true', 'yes', 'on'].includes(String(process.env.FORCE_ASSET_OPTIMIZE || '').trim().toLowerCase());
const optimizeStats = {
  brand: { rendered: 0, reused: 0 },
  gallery: { rendered: 0, reused: 0 }
};

const readMetadata = async (source) => {
  if (!metadataCache.has(source)) {
    metadataCache.set(source, sharp(source).metadata());
  }

  return metadataCache.get(source);
};

const hasFreshOutputs = async (source, outputs) => {
  if (forceOptimize) return false;

  const sourceStat = await fs.promises.stat(source);
  const outputStats = await Promise.all(
    outputs.map(async (filePath) => {
      try {
        return await fs.promises.stat(filePath);
      } catch (_error) {
        return null;
      }
    })
  );

  if (outputStats.some((stat) => !stat || !stat.isFile() || stat.size <= 0)) {
    return false;
  }

  return outputStats.every((stat) => stat.mtimeMs >= sourceStat.mtimeMs);
};

const resizeMetadata = async (source, width) => {
  const metadata = await readMetadata(source);
  const originalWidth = Number(metadata.width) || width;
  const originalHeight = Number(metadata.height) || width;
  const targetWidth = Math.min(originalWidth, width);
  const targetHeight = Math.max(1, Math.round((originalHeight / originalWidth) * targetWidth));
  return {
    targetWidth,
    targetHeight
  };
};

const renderBrandAsset = async (asset) => {
  const pngPath = `${asset.outputBase}.png`;
  const webpPath = `${asset.outputBase}.webp`;
  const avifPath = `${asset.outputBase}.avif`;

  const { targetWidth, targetHeight } = await resizeMetadata(asset.source, asset.width);

  await ensureDir(pngPath);

  if (await hasFreshOutputs(asset.source, [pngPath, webpPath, avifPath])) {
    optimizeStats.brand.reused += 1;
    return {
      fallback: toPublicPath(pngPath),
      webp: toPublicPath(webpPath),
      avif: toPublicPath(avifPath),
      width: targetWidth,
      height: targetHeight
    };
  }

  await sharp(asset.source)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .png({ compressionLevel: 9, quality: 85 })
    .toFile(pngPath);

  await sharp(asset.source)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(webpPath);

  await sharp(asset.source)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .avif({ quality: 62 })
    .toFile(avifPath);

  optimizeStats.brand.rendered += 1;

  return {
    fallback: toPublicPath(pngPath),
    webp: toPublicPath(webpPath),
    avif: toPublicPath(avifPath),
    width: targetWidth,
    height: targetHeight
  };
};

const renderGalleryVariant = async (source, outputBase, width, suffix = '') => {
  const jpgPath = `${outputBase}${suffix}.jpg`;
  const webpPath = `${outputBase}${suffix}.webp`;
  const avifPath = `${outputBase}${suffix}.avif`;
  const { targetWidth, targetHeight } = await resizeMetadata(source, width);

  await ensureDir(jpgPath);

  if (await hasFreshOutputs(source, [jpgPath, webpPath, avifPath])) {
    return {
      width: targetWidth,
      height: targetHeight,
      jpgPath,
      webpPath,
      avifPath
    };
  }

  await sharp(source)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(jpgPath);

  await sharp(source)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(webpPath);

  await sharp(source)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .avif({ quality: 58 })
    .toFile(avifPath);

  return {
    width: targetWidth,
    height: targetHeight,
    jpgPath,
    webpPath,
    avifPath
  };
};

const renderGalleryAsset = async (asset) => {
  const widths = [...new Set((asset.widths || []).map((value) => Number(value)).filter(Boolean))].sort((a, b) => a - b);
  const sourceMetadata = await readMetadata(asset.source);
  const originalWidth = Number(sourceMetadata.width) || widths[widths.length - 1];
  const uniqueWidths = [...new Set(widths.concat(originalWidth))].sort((a, b) => a - b);

  let renderedAnyVariant = false;
  const variants = [];
  for (const width of uniqueWidths) {
    const isLargest = width === uniqueWidths[uniqueWidths.length - 1];
    const outputBase = asset.outputBase;
    const suffix = isLargest ? '' : `-${width}`;
    const before = forceOptimize ? false : await hasFreshOutputs(asset.source, [`${outputBase}${suffix}.jpg`, `${outputBase}${suffix}.webp`, `${outputBase}${suffix}.avif`]);
    variants.push(await renderGalleryVariant(asset.source, outputBase, width, suffix));
    if (!before) {
      renderedAnyVariant = true;
    }
  }

  if (renderedAnyVariant) {
    optimizeStats.gallery.rendered += 1;
  } else {
    optimizeStats.gallery.reused += 1;
  }

  const largest = variants[variants.length - 1];
  const srcSet = (key) =>
    variants
      .map((variant) => `${toPublicPath(variant[key])} ${variant.width}w`)
      .join(', ');

  return {
    fallback: toPublicPath(largest.jpgPath),
    fallbackSet: srcSet('jpgPath'),
    webp: toPublicPath(largest.webpPath),
    webpSet: srcSet('webpPath'),
    avif: toPublicPath(largest.avifPath),
    avifSet: srcSet('avifPath'),
    width: largest.width,
    height: largest.height,
    sizes: '(max-width: 640px) 88vw, (max-width: 992px) 92vw, 66vw',
    thumbnailSizes: '(max-width: 640px) 42vw, 96px'
  };
};

const writeManifest = async (manifest) => {
  const filePath = path.join(__dirname, '..', 'asset-manifest.js');
  const content = `const manifest = ${JSON.stringify(manifest, null, 2)};\n\nif (typeof window !== 'undefined') {\n  window.LEVEL_LINES_ASSETS = manifest;\n}\n\nif (typeof module !== 'undefined') {\n  module.exports = manifest;\n}\n`;
  const existing = await fs.promises.readFile(filePath, 'utf8').catch(() => '');
  if (existing !== content) {
    await fs.promises.writeFile(filePath, content, 'utf8');
  }
};

const buildManifest = async () => {
  const manifest = {
    brand: {},
    gallery: {}
  };

  for (const asset of brandAssets) {
    manifest.brand[asset.key] = await renderBrandAsset(asset);
  }

  for (const asset of galleryAssets) {
    manifest.gallery[asset.publicPath] = await renderGalleryAsset(asset);
  }

  return manifest;
};

const run = async () => {
  const manifest = await buildManifest();
  await writeManifest(manifest);
  console.log(
    `Optimized ${Object.keys(manifest.brand).length} brand assets and ${Object.keys(manifest.gallery).length} gallery assets. ` +
      `Rendered brand: ${optimizeStats.brand.rendered}, reused brand: ${optimizeStats.brand.reused}, ` +
      `rendered gallery: ${optimizeStats.gallery.rendered}, reused gallery: ${optimizeStats.gallery.reused}.`
  );
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
