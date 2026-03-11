const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { brandAssets, galleryAssets } = require('./asset-optimization.config');

const ensureDir = async (filePath) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
};

const toPublicPath = (filePath) => `/${path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/')}`;

const withWidthSuffix = (basePath, width) => `${basePath}-${width}`;

const resizeMetadata = async (source, width) => {
  const metadata = await sharp(source).metadata();
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
  const sourceMetadata = await sharp(asset.source).metadata();
  const originalWidth = Number(sourceMetadata.width) || widths[widths.length - 1];
  const uniqueWidths = [...new Set(widths.concat(originalWidth))].sort((a, b) => a - b);

  const variants = [];
  for (const width of uniqueWidths) {
    const isLargest = width === uniqueWidths[uniqueWidths.length - 1];
    const outputBase = asset.outputBase;
    const suffix = isLargest ? '' : `-${width}`;
    variants.push(await renderGalleryVariant(asset.source, outputBase, width, suffix));
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
  await fs.promises.writeFile(filePath, content, 'utf8');
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
  console.log(`Optimized ${Object.keys(manifest.brand).length} brand assets and ${Object.keys(manifest.gallery).length} gallery assets.`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
