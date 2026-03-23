const path = require('path');
const { listFolderGallerySourceImagesSync } = require('../utils/folderGallery');

const root = (...segments) => path.join(__dirname, '..', ...segments);
const galleryRoot = root('Gallery');
const optimizedGalleryRoot = root('Gallery', 'optimized');

const brandAssets = [
  {
    key: 'headerIcon',
    source: root('logo.png'),
    outputBase: root('assets', 'optimized', 'brand', 'logo'),
    width: 420
  },
  {
    key: 'title',
    source: root('title.png'),
    outputBase: root('assets', 'optimized', 'brand', 'title'),
    width: 1800
  },
  {
    key: 'workspace',
    source: root('logo4.png'),
    outputBase: root('assets', 'optimized', 'brand', 'logo4'),
    width: 520
  }
];

const premiumGalleryAssets = [
  {
    publicPath: '/Gallery/premium/bathroom-main.jpg',
    source: root('Gallery', 'bathroom', 'The Slate Suite.png'),
    outputBase: root('Gallery', 'premium', 'bathroom-main'),
    widths: [960, 1600]
  },
  {
    publicPath: '/Gallery/premium/bathroom-bathtub.jpg',
    source: root('Gallery', 'bathroom', 'Rustic Harmony.png'),
    outputBase: root('Gallery', 'premium', 'bathroom-bathtub'),
    widths: [960, 1600]
  },
  {
    publicPath: '/Gallery/premium/bathroom-tiles.jpg',
    source: root('Gallery', 'bathroom', 'The Slate Suite.png'),
    outputBase: root('Gallery', 'premium', 'bathroom-tiles'),
    widths: [960, 1600]
  },
  {
    publicPath: '/Gallery/premium/kitchen-panorama-main.jpg',
    source: root('Gallery', 'kitchen', 'Midnight Marble.png'),
    outputBase: root('Gallery', 'premium', 'kitchen-panorama-main'),
    widths: [960, 1600]
  },
  {
    publicPath: '/Gallery/premium/kitchen-panorama-left.jpg',
    source: root('Gallery', 'kitchen', 'Alabaster Horizon.png'),
    outputBase: root('Gallery', 'premium', 'kitchen-panorama-left'),
    widths: [960, 1600]
  },
  {
    publicPath: '/Gallery/premium/kitchen-panorama-right.jpg',
    source: root('Gallery', 'kitchen', 'Obsidian Oak.png'),
    outputBase: root('Gallery', 'premium', 'kitchen-panorama-right'),
    widths: [960, 1600]
  },
  {
    publicPath: '/Gallery/premium/exterior-front.jpg',
    source: root('Gallery', 'exterior', 'Rendering.jpg'),
    outputBase: root('Gallery', 'premium', 'exterior-front'),
    widths: [960, 1600]
  },
  {
    publicPath: '/Gallery/premium/exterior-chimney.jpg',
    source: root('Gallery', 'exterior', 'Rendering.png'),
    outputBase: root('Gallery', 'premium', 'exterior-chimney'),
    widths: [960, 1600]
  },
  {
    publicPath: '/Gallery/premium/exterior-wood-gables.jpg',
    source: root('Gallery', 'exterior', 'White brickslips.png'),
    outputBase: root('Gallery', 'premium', 'exterior-wood-gables'),
    widths: [960, 1600]
  },
  {
    publicPath: '/Gallery/premium/brick-dark-main.jpg',
    source: root('Gallery', 'exterior', 'charcoal brickslips.png'),
    outputBase: root('Gallery', 'premium', 'brick-dark-main'),
    widths: [960, 1600]
  },
  {
    publicPath: '/Gallery/premium/brick-detail-charcoal.jpg',
    source: root('Gallery', 'exterior', 'charcoal brickslips.jpg'),
    outputBase: root('Gallery', 'premium', 'brick-detail-charcoal'),
    widths: [960, 1600]
  },
  {
    publicPath: '/Gallery/premium/brick-detail-red.jpg',
    source: root('Gallery', 'exterior', 'Brick veneers.jpg'),
    outputBase: root('Gallery', 'premium', 'brick-detail-red'),
    widths: [960, 1600]
  }
];

const buildOptimizedGalleryOutputBase = ({ folderName, fileName }) => {
  const parsed = path.parse(fileName);
  const safeBaseName = `${parsed.name}-${parsed.ext.replace(/^\./, '').toLowerCase()}`
    .replace(/[<>:"/\\|?*]+/g, '-')
    .trim();
  return path.join(optimizedGalleryRoot, folderName, safeBaseName);
};

const folderGalleryAssets = listFolderGallerySourceImagesSync(galleryRoot).map((entry) => ({
  publicPath: entry.publicPath,
  source: entry.sourcePath,
  outputBase: buildOptimizedGalleryOutputBase(entry),
  widths: [960, 1600]
}));

const galleryAssets = premiumGalleryAssets.concat(folderGalleryAssets);

module.exports = {
  brandAssets,
  galleryAssets
};
