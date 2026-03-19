(() => {
  const runtime = globalThis.LevelLinesRuntime || {};
  const getOptimizedMedia = runtime.getOptimizedMedia || ((src) => ({ fallback: src }));
  const syncKeyedList = runtime.syncKeyedList || ((container, items, { getKey, createNode, updateNode } = {}) => {
    if (!container) return;

    const existingByKey = new Map();
    Array.from(container.children).forEach((child) => {
      if (child.dataset.renderKey) {
        existingByKey.set(child.dataset.renderKey, child);
      }
    });

    const orderedNodes = (Array.isArray(items) ? items : []).map((item, index) => {
      const key = String(getKey(item, index));
      let node = existingByKey.get(key);
      if (!node) {
        node = createNode(item, index);
        node.dataset.renderKey = key;
      }
      updateNode(node, item, index);
      existingByKey.delete(key);
      return node;
    });

    orderedNodes.forEach((node, index) => {
      const currentNode = container.children[index];
      if (currentNode !== node) {
        container.insertBefore(node, currentNode || null);
      }
    });

    existingByKey.forEach((node) => node.remove());
  });
  const createResponsivePicture = runtime.createResponsivePicture || ((media, options = {}) => {
    const image = document.createElement('img');
    image.src = media?.fallback || media?.src || '';
    image.alt = options.alt || '';
    image.loading = options.loading || 'lazy';
    image.decoding = options.decoding || 'async';
    if (options.imgClassName) image.className = options.imgClassName;
    if (media?.width) image.width = media.width;
    if (media?.height) image.height = media.height;
    return image;
  });

  const roller = document.querySelector('[data-gallery-roller]');
  const stage = document.querySelector('[data-gallery-stage]');
  const projectStrip = document.querySelector('[data-gallery-projects]');
  const prevButton = document.querySelector('[data-gallery-prev]');
  const nextButton = document.querySelector('[data-gallery-next]');
  const projectPrevButton = document.querySelector('[data-gallery-project-prev]');
  const projectNextButton = document.querySelector('[data-gallery-project-next]');
  const statusNode = document.querySelector('[data-gallery-status]');
  const imageTitleNode = document.querySelector('[data-gallery-active-image-title]');
  const projectTitleNode = document.querySelector('[data-gallery-active-project-title]');
  const projectMetaNode = document.querySelector('[data-gallery-active-project-meta]');
  const gallerySource = String(document.body?.dataset?.gallerySource || 'services').trim().toLowerCase() === 'services'
    ? 'services'
    : 'projects';

  if (!roller || !stage || !projectStrip || !prevButton || !nextButton) return;
  roller.setAttribute('tabindex', '0');
  projectStrip.setAttribute('tabindex', '0');

  const defaultCollectionsBySource = {
    projects: [
      {
        name: 'Bathrooms - Didsbury',
        images: [
          '/Gallery/premium/bathroom-main.jpg',
          '/Gallery/premium/bathroom-bathtub.jpg',
          '/Gallery/premium/bathroom-tiles.jpg'
        ]
      },
      {
        name: 'Kitchens - Altrincham',
        images: [
          '/Gallery/premium/kitchen-panorama-main.jpg',
          '/Gallery/premium/kitchen-panorama-left.jpg',
          '/Gallery/premium/kitchen-panorama-right.jpg'
        ]
      },
      {
        name: 'Exterior Craft - Wilmslow',
        images: [
          '/Gallery/premium/exterior-front.jpg',
          '/Gallery/premium/exterior-chimney.jpg',
          '/Gallery/premium/exterior-wood-gables.jpg'
        ]
      },
      {
        name: 'Stone Detail - Chorlton',
        images: [
          '/Gallery/premium/brick-dark-main.jpg',
          '/Gallery/premium/brick-detail-charcoal.jpg',
          '/Gallery/premium/brick-detail-red.jpg'
        ]
      }
    ],
    services: [
      {
        name: 'Bathrooms',
        images: [
          { src: '/Gallery/bathrooms/primary-suite-overview.jpg', label: 'Primary suite overview' },
          { src: '/Gallery/bathrooms/freestanding-bath-detail.jpg', label: 'Freestanding bath detail' },
          { src: '/Gallery/bathrooms/wet-room-tile-geometry.jpg', label: 'Wet-room tile geometry' }
        ]
      },
      {
        name: 'Kitchens',
        images: [
          { src: '/Gallery/kitchens/island-overview.jpg', label: 'Island overview' },
          { src: '/Gallery/kitchens/joinery-left-run.jpg', label: 'Joinery left run' },
          { src: '/Gallery/kitchens/finish-right-run.jpg', label: 'Finish right run' }
        ]
      },
      {
        name: 'Interiors',
        images: [
          { src: '/Gallery/interiors/material-surface-overview.jpg', label: 'Material surface overview' },
          { src: '/Gallery/interiors/charcoal-finish-detail.jpg', label: 'Charcoal finish detail' },
          { src: '/Gallery/interiors/warm-finish-detail.jpg', label: 'Warm finish detail' }
        ]
      },
      {
        name: 'Exteriors',
        images: [
          { src: '/Gallery/exteriors/front-elevation-overview.jpg', label: 'Front elevation overview' },
          { src: '/Gallery/exteriors/chimney-detail.jpg', label: 'Chimney detail' },
          { src: '/Gallery/exteriors/timber-gable-detail.jpg', label: 'Timber gable detail' }
        ]
      }
    ]
  };
  const SERVICE_COLLECTION_DEFINITIONS = [
    {
      key: 'full-bathroom-renovations',
      title: 'Full Bathroom Renovations',
      description: 'Wet rooms, bathing layouts and bathroom finish details.',
      sources: ['bathrooms']
    },
    {
      key: 'kitchen-installation-and-refurbishment',
      title: 'Kitchen Installation and Refurbishment',
      description: 'Joinery runs, worktops and kitchen installation sequences.',
      sources: ['kitchens']
    },
    {
      key: 'tiling-large-format-wet-showers-exterior',
      title: 'Tiling incl. Large Format / Wet Showers / Exterior',
      description: 'Large-format tiling, wet-shower geometry and exterior finish details.',
      sources: ['bathrooms', 'exteriors']
    },
    {
      key: 'carpentry',
      title: 'Carpentry',
      description: 'Joinery, timber detailing and trim-led carpentry work.',
      sources: ['kitchens', 'exteriors']
    },
    {
      key: 'interior-and-exterior-wall',
      title: 'Interior and Exterior Wall',
      description: 'Interior wall work, external surfaces and finish consistency across both.',
      sources: ['interiors', 'exteriors']
    }
  ];
  let projects = [];

  const MOTION_PROFILES = {
    subtle: {
      visibleDistance: 1.38,
      translateX: 216,
      farLift: -4,
      scaleDrop: 0.14,
      rotateY: 38,
      brightnessDrop: 0.46,
      saturationDrop: 0.12,
      speedToBlur: 2.4,
      blurMax: 1.4,
      blurBase: 0.18,
      blurSide: 0.52,
      zDrop: 100,
      springBase: 0.095,
      springSpeed: 0.035,
      springEnergy: 0.032,
      dampingBase: 0.9,
      dampingSpeed: 0.05,
      dampingEnergy: 0.03,
      dampingMin: 0.76,
      energyDecay: 0.95,
      cadenceWindow: 300,
      streakMax: 5,
      cadenceStep: 0.08,
      energyBlend: 0.7,
      energyGain: 0.17,
      impulseBase: 0.095,
      impulseStep: 0.04
    },
    dramatic: {
      visibleDistance: 1.45,
      translateX: 248,
      farLift: -6,
      scaleDrop: 0.18,
      rotateY: 52,
      brightnessDrop: 0.62,
      saturationDrop: 0.2,
      speedToBlur: 3.1,
      blurMax: 2.6,
      blurBase: 0.35,
      blurSide: 0.9,
      zDrop: 120,
      springBase: 0.11,
      springSpeed: 0.05,
      springEnergy: 0.05,
      dampingBase: 0.87,
      dampingSpeed: 0.08,
      dampingEnergy: 0.05,
      dampingMin: 0.72,
      energyDecay: 0.93,
      cadenceWindow: 260,
      streakMax: 6,
      cadenceStep: 0.12,
      energyBlend: 0.65,
      energyGain: 0.22,
      impulseBase: 0.12,
      impulseStep: 0.05
    }
  };

  const requestedProfile = String(roller.getAttribute('data-motion-profile') || 'dramatic').trim().toLowerCase();
  const profile = MOTION_PROFILES[requestedProfile] || MOTION_PROFILES.dramatic;
  roller.dataset.motionProfile = requestedProfile in MOTION_PROFILES ? requestedProfile : 'dramatic';

  const state = {
    projectIndex: 0,
    position: 0,
    target: 0,
    velocity: 0,
    rafId: null,
    lastInputAt: 0,
    inputStreak: 0,
    inputEnergy: 0,
    cards: [],
    chips: []
  };

  let lightboxRoot = null;
  let lightboxImageHost = null;
  let lightboxCaption = null;

  const toTitleCase = (value) =>
    String(value || '')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const labelFromImagePath = (src) => {
    const filename = String(src || '').split('/').pop() || '';
    const base = filename.replace(/\.[a-z0-9]+$/i, '');
    return toTitleCase(base.replace(/[-_]+/g, ' ')) || 'Selected image';
  };

  const levelLabel = (index) => `${gallerySource === 'services' ? 'Service' : 'Level'} ${String(index + 1).padStart(2, '0')}`;

  const splitProjectName = (value) => {
    if (gallerySource === 'services') {
      const normalizedValue = String(value || 'Service').trim() || 'Service';
      return {
        title: normalizedValue,
        subtitle: 'Completed service gallery'
      };
    }

    const parts = String(value || '')
      .split(/\s+-\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    return {
      title: parts[0] || String(value || 'Project'),
      subtitle: parts[1] || 'North West project'
    };
  };

  const normalizeImageItem = (entry) => {
    if (entry && typeof entry === 'object') {
      const src = String(entry.src || entry.url || '').trim();
      if (!src) return null;
      return {
        src,
        label: String(entry.label || '').trim() || labelFromImagePath(src),
        media: getOptimizedMedia(src, {
          sizes: entry.sizes,
          thumbnailSizes: entry.thumbnailSizes
        })
      };
    }

    const src = String(entry || '').trim();
    if (!src) return null;
    return {
      src,
      label: labelFromImagePath(src),
      media: getOptimizedMedia(src)
    };
  };

  const normalizeProjects = (rawProjects) =>
    (Array.isArray(rawProjects) ? rawProjects : [])
      .map((project) => ({
        id: String(project?.id || project?.name || '').trim().toLowerCase(),
        name: String(project?.name || '').trim() || (gallerySource === 'services' ? 'Service' : 'Project'),
        images: (Array.isArray(project?.images) ? project.images : []).map(normalizeImageItem).filter(Boolean)
      }))
      .filter((project) => project.images.length);

  const buildCuratedServiceCollections = (collections) => {
    const normalizedCollections = normalizeProjects(collections);
    const collectionsById = new Map();

    normalizedCollections.forEach((collection) => {
      const normalizedId = String(collection.id || collection.name || '').trim().toLowerCase();
      if (!normalizedId) return;
      collectionsById.set(normalizedId, collection);
    });

    const appendUniqueSourceImages = (images, source, seenSources) => {
      if (!source) return;
      source.images.forEach((image) => {
        const imageKey = String(image.src || image.media?.fallback || '').trim();
        if (!imageKey || seenSources.has(imageKey)) return;
        seenSources.add(imageKey);
        images.push(image);
      });
    };

    const curated = SERVICE_COLLECTION_DEFINITIONS.map((definition) => {
      const images = [];
      const seenSources = new Set();

      definition.sources.forEach((sourceKey) => {
        const source = collectionsById.get(String(sourceKey || '').trim().toLowerCase());
        appendUniqueSourceImages(images, source, seenSources);
      });

      return {
        id: definition.key,
        name: definition.title,
        description: definition.description,
        images
      };
    }).filter((collection) => collection.images.length);

    return curated.length ? curated : normalizedCollections;
  };

  const normalizeIndex = (value, size) => {
    if (size <= 0) return 0;
    return (value % size + size) % size;
  };

  const normalizePosition = (value, size) => {
    if (size <= 0) return 0;

    let normalized = value;
    while (normalized < 0) normalized += size;
    while (normalized >= size) normalized -= size;

    return normalized;
  };

  const shortestDelta = (from, to, size) => {
    if (size <= 0) return 0;

    let delta = to - from;
    if (delta > size / 2) delta -= size;
    if (delta < -size / 2) delta += size;

    return delta;
  };

  const currentProject = () => projects[state.projectIndex];

  const findPictureImage = (node) => node?.querySelector('img');

  const syncPictureNode = (container, picture, mediaKey) => {
    const currentPicture = container.firstElementChild;
    if (container.dataset.mediaKey !== mediaKey || !currentPicture) {
      if (currentPicture) {
        currentPicture.replaceWith(picture);
      } else {
        container.prepend(picture);
      }
      container.dataset.mediaKey = mediaKey;
      return;
    }

    const nextImage = findPictureImage(picture);
    const currentImage = findPictureImage(currentPicture);
    if (currentImage && nextImage) {
      currentImage.alt = nextImage.alt;
      currentImage.loading = nextImage.loading;
      currentImage.decoding = nextImage.decoding;
      if (nextImage.width) currentImage.width = nextImage.width;
      if (nextImage.height) currentImage.height = nextImage.height;
    }
  };

  const loadManagedProjects = async () => {
    try {
      const response = await fetch('/api/gallery/projects', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;

      const payload = await response.json().catch(() => ({}));
      const managed = normalizeProjects(payload.projects);

      if (managed.length) {
        projects = managed;
      }
    } catch (error) {
      // Keep static fallback when API is unavailable.
    }
  };

  const loadServiceCollections = async () => {
    try {
      const response = await fetch('/api/gallery/services', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;

      const payload = await response.json().catch(() => ({}));
      const serviceCollections = normalizeProjects(payload.services);

      if (serviceCollections.length) {
        projects = serviceCollections;
      }
    } catch (error) {
      // Keep static fallback when API is unavailable.
    }
  };

  const loadInlineProjects = () => {
    const node = document.querySelector('[data-gallery-projects-json]');
    if (!node) return false;

    try {
      const payload = JSON.parse(node.textContent || '[]');
      const inlineProjects = normalizeProjects(payload);

      if (!inlineProjects.length) return false;

      projects = inlineProjects;
      return true;
    } catch (error) {
      return false;
    }
  };

  const getPhotoOrdinalText = (index, total) => `photo ${index + 1} of ${total}`;

  const getFallbackImageLabel = (centeredIndex) => `Photo ${centeredIndex + 1}`;

  const getDisplayImageLabel = (imageItem, centeredIndex) => (
    imageItem?.label || getFallbackImageLabel(centeredIndex)
  );

  const buildProjectMetaText = ({ project, total, centeredIndex, projectName }) => {
    const photoOrdinal = getPhotoOrdinalText(centeredIndex, total);
    if (gallerySource === 'services') {
      return `${project.description || projectName.subtitle} | ${total} completed-work images | ${photoOrdinal}`;
    }
    return `${levelLabel(state.projectIndex)} | ${total} image sequence | ${photoOrdinal}`;
  };

  const buildGalleryStatusText = ({ project, imageLabel, total, centeredIndex }) => {
    const photoOrdinal = getPhotoOrdinalText(centeredIndex, total);
    if (gallerySource === 'services') {
      return `${project.name} / ${imageLabel} / ${photoOrdinal}`;
    }
    return `${levelLabel(state.projectIndex)} / ${project.name} / ${imageLabel} / ${photoOrdinal}`;
  };

  const setStatus = () => {
    const project = currentProject();
    if (!project) return;
    const total = project.images.length;
    const centeredIndex = normalizeIndex(Math.round(state.position), total);
    const imageItem = project.images[centeredIndex];
    const projectName = splitProjectName(project.name);
    const imageLabel = getDisplayImageLabel(imageItem, centeredIndex);

    if (imageTitleNode) {
      imageTitleNode.textContent = imageItem?.label || 'Selected image';
    }

    if (projectTitleNode) {
      projectTitleNode.textContent = project.name;
    }

    if (projectMetaNode) {
      projectMetaNode.textContent = buildProjectMetaText({ project, total, centeredIndex, projectName });
    }

    if (statusNode) {
      statusNode.textContent = buildGalleryStatusText({ project, imageLabel, total, centeredIndex });
    }
  };

  const ensureLightbox = () => {
    if (lightboxRoot) return lightboxRoot;

    lightboxRoot = document.createElement('div');
    lightboxRoot.className = 'gallery-lightbox';
    lightboxRoot.hidden = true;
    lightboxRoot.setAttribute('aria-hidden', 'true');
    lightboxRoot.innerHTML = `
      <div class="gallery-lightbox-backdrop" data-gallery-lightbox-close></div>
      <div class="gallery-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Gallery image fullscreen view">
        <button class="gallery-lightbox-close" type="button" data-gallery-lightbox-close aria-label="Close fullscreen image">&times;</button>
        <figure class="gallery-lightbox-figure">
          <div class="gallery-lightbox-image" data-gallery-lightbox-image></div>
          <figcaption class="gallery-lightbox-caption" data-gallery-lightbox-caption></figcaption>
        </figure>
      </div>
    `;

    document.body.appendChild(lightboxRoot);
    lightboxImageHost = lightboxRoot.querySelector('[data-gallery-lightbox-image]');
    lightboxCaption = lightboxRoot.querySelector('[data-gallery-lightbox-caption]');

    lightboxRoot.querySelectorAll('[data-gallery-lightbox-close]').forEach((node) => {
      node.addEventListener('click', () => closeLightbox());
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && lightboxRoot && !lightboxRoot.hidden) {
        closeLightbox();
      }
    });

    return lightboxRoot;
  };

  const closeLightbox = () => {
    if (!lightboxRoot || lightboxRoot.hidden) return;
    lightboxRoot.hidden = true;
    lightboxRoot.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gallery-lightbox-open');
  };

  const openLightbox = (imageItem, project, imageIndex) => {
    if (!imageItem || !project) return;
    ensureLightbox();

    const picture = createResponsivePicture(imageItem.media, {
      alt: `${project.name} - ${imageItem.label}`,
      className: 'gallery-lightbox-picture',
      imgClassName: 'gallery-lightbox-photo',
      loading: 'eager'
    });

    lightboxImageHost.innerHTML = '';
    lightboxImageHost.appendChild(picture);
    lightboxCaption.textContent = `${project.name} | ${imageItem.label} | Photo ${imageIndex + 1} of ${project.images.length}`;

    lightboxRoot.hidden = false;
    lightboxRoot.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gallery-lightbox-open');
  };

  const getRollerCardMediaKey = (project, imageItem, index) => (
    imageItem.src || imageItem.media?.fallback || `${project.name}-${index}`
  );

  const openRollerCardLightbox = (card) => {
    const project = currentProject();
    if (!project) return;
    const cardIndex = Number(card.dataset.index || 0);
    const imageItem = project.images[cardIndex];
    openLightbox(imageItem, project, cardIndex);
  };

  const handleRollerCardKeydown = (event, card) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openRollerCardLightbox(card);
  };

  const ensureRollerCaptionNode = (card) => {
    let caption = card.querySelector('.roller-caption');
    if (!caption) {
      caption = document.createElement('p');
      caption.className = 'roller-caption';
      card.appendChild(caption);
    }
    return caption;
  };

  const createRollerCardNode = () => {
    const card = document.createElement('article');
    card.className = 'roller-card is-hidden';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Open image fullscreen');
    card.addEventListener('click', () => openRollerCardLightbox(card));
    card.addEventListener('keydown', (event) => handleRollerCardKeydown(event, card));
    card.appendChild(ensureRollerCaptionNode(card));
    return card;
  };

  const updateRollerCardNode = (project, card, imageItem, index) => {
    card.dataset.index = String(index);
    card.setAttribute('aria-label', `Open ${imageItem.label} fullscreen`);
    const mediaKey = getRollerCardMediaKey(project, imageItem, index);
    const picture = createResponsivePicture(imageItem.media, {
      alt: `${project.name} - ${imageItem.label}`,
      className: 'roller-picture',
      imgClassName: 'roller-image',
      loading: 'lazy',
      sizes: imageItem.media?.sizes
    });
    syncPictureNode(card, picture, mediaKey);

    const caption = ensureRollerCaptionNode(card);
    if (caption.textContent !== imageItem.label) {
      caption.textContent = imageItem.label;
    }
  };

  const stopAnimation = () => {
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }

    stage.classList.remove('is-rolling');
  };

  const updateProjectStripState = () => {
    state.chips.forEach((chip, index) => {
      const isActive = index === state.projectIndex;
      chip.classList.toggle('is-active', isActive);
      chip.setAttribute('aria-pressed', String(isActive));

      if (isActive) {
        chip.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
          behavior: 'smooth'
        });
      }
    });
  };

  const selectProject = (index) => {
    const nextIndex = normalizeIndex(index, projects.length);
    if (state.projectIndex === nextIndex && state.cards.length) return;

    state.projectIndex = nextIndex;
    state.target = 0;
    state.position = 0;
    state.velocity = 0;
    state.inputStreak = 0;
    state.inputEnergy = 0;

    updateProjectStripState();
    buildRoller();
  };

  const shiftProject = (step) => {
    if (projects.length <= 1) return;
    selectProject(state.projectIndex + step);
  };

  const applyTransforms = () => {
    const cards = state.cards;
    const total = cards.length;
    if (!total) return;
    const baseCardWidth = cards[0]?.offsetWidth || 0;
    const stageWidth = stage.clientWidth || 0;
    const sideGutter = Math.min(48, Math.max(24, stageWidth * 0.03));
    const availableTranslate = Math.max(0, stageWidth / 2 - baseCardWidth / 2 - sideGutter);
    const translateBase = Math.max(
      profile.translateX,
      Math.min(availableTranslate * 0.95, profile.translateX * 1.75)
    );

    cards.forEach((card, index) => {
      const delta = shortestDelta(state.position, index, total);
      const absDelta = Math.abs(delta);
      const visible = absDelta <= profile.visibleDistance;

      const x = delta * translateBase;
      const y = absDelta > 1 ? profile.farLift : 0;
      const scale = 1 - Math.min(absDelta, 1.25) * profile.scaleDrop;
      const rotateY = -delta * profile.rotateY;
      const brightness = 1 - Math.min(absDelta, 1.25) * profile.brightnessDrop;
      const saturation = 1 - Math.min(absDelta, 1.25) * profile.saturationDrop;
      const speed = Math.min(1, Math.abs(state.velocity) * profile.speedToBlur);
      const blur = Math.min(profile.blurMax, speed * (profile.blurBase + Math.min(absDelta, 1.2) * profile.blurSide));
      const opacity = visible ? (absDelta <= 1 ? 1 : Math.max(0, 1 - (absDelta - 1) * 2.2)) : 0;
      const zIndex = visible ? 300 - Math.round(absDelta * profile.zDrop) : 1;

      card.style.transform = `translate(-50%, -50%) translateX(${x.toFixed(1)}px) translateY(${y}px) scale(${scale.toFixed(3)}) rotateY(${rotateY.toFixed(2)}deg)`;
      card.style.filter = `brightness(${brightness.toFixed(3)}) saturate(${saturation.toFixed(3)})`;
      card.style.setProperty('--motion-blur', `${blur.toFixed(3)}px`);
      card.style.opacity = opacity.toFixed(3);
      card.style.zIndex = String(zIndex);

      card.classList.toggle('is-hidden', !visible);
      card.classList.toggle('is-center', absDelta < 0.35);
      card.classList.toggle('is-left', visible && delta < -0.35);
      card.classList.toggle('is-right', visible && delta > 0.35);
    });

    setStatus();
  };

  const animate = () => {
    const total = currentProject().images.length;
    const delta = shortestDelta(state.position, state.target, total);
    const speed = Math.min(1, Math.abs(state.velocity) * 2.8);
    const spring = profile.springBase + speed * profile.springSpeed + state.inputEnergy * profile.springEnergy;
    const damping = Math.max(
      profile.dampingMin,
      profile.dampingBase - speed * profile.dampingSpeed - state.inputEnergy * profile.dampingEnergy
    );

    // Adaptive spring-damping. Faster click cadence produces a tighter, more cinematic turn.
    state.velocity += delta * spring;
    state.velocity *= damping;
    state.position = normalizePosition(state.position + state.velocity, total);
    state.inputEnergy *= profile.energyDecay;

    applyTransforms();

    if (Math.abs(delta) < 0.002 && Math.abs(state.velocity) < 0.002) {
      state.position = normalizePosition(state.target, total);
      state.velocity = 0;
      applyTransforms();
      stopAnimation();
      return;
    }

    state.rafId = requestAnimationFrame(animate);
  };

  const startAnimation = () => {
    stage.classList.add('is-rolling');
    if (!state.rafId) {
      state.rafId = requestAnimationFrame(animate);
    }
  };

  const buildRoller = () => {
    stopAnimation();

    const project = currentProject();
    syncKeyedList(stage, project.images, {
      getKey: (imageItem, index) => getRollerCardMediaKey(project, imageItem, index),
      createNode: () => createRollerCardNode(),
      updateNode: (card, imageItem, index) => updateRollerCardNode(project, card, imageItem, index)
    });

    state.cards = Array.from(stage.querySelectorAll('.roller-card'));

    state.position = normalizePosition(state.target, project.images.length);
    state.velocity = 0;
    state.inputStreak = 0;
    state.inputEnergy = 0;

    applyTransforms();
  };

  const buildProjectStrip = () => {
    syncKeyedList(projectStrip, projects, {
      getKey: (project, index) => project.name || project.images[0]?.src || index,
      createNode: () => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gallery-service-button';
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => {
          const nextIndex = Number(button.dataset.projectIndex || 0);
          selectProject(nextIndex);
        });
        const label = document.createElement('span');
        label.className = 'gallery-service-button-label';
        button.appendChild(label);
        return button;
      },
      updateNode: (button, project, index) => {
        button.dataset.projectIndex = String(index);
        button.setAttribute('aria-label', `Show ${gallerySource === 'services' ? 'service' : 'project'} ${project.name}`);
        const label = button.querySelector('.gallery-service-button-label');
        if (label && label.textContent !== project.name) {
          label.textContent = project.name;
        }
      }
    });

    state.chips = Array.from(projectStrip.querySelectorAll('.gallery-service-button'));

    updateProjectStripState();
  };

  const getDefaultProjects = () => (
    gallerySource === 'services'
      ? buildCuratedServiceCollections(defaultCollectionsBySource.services)
      : normalizeProjects(defaultCollectionsBySource[gallerySource] || defaultCollectionsBySource.projects)
  );

  const loadRemoteProjects = async () => {
    if (gallerySource === 'services') {
      await loadServiceCollections();
      return;
    }
    await loadManagedProjects();
  };

  const finalizeServiceProjects = () => {
    if (gallerySource !== 'services') return;
    projects = buildCuratedServiceCollections(projects);
  };

  const setGalleryDisabledState = () => {
    if (statusNode) statusNode.textContent = 'No gallery photos available yet.';
    prevButton.disabled = true;
    nextButton.disabled = true;
    if (projectPrevButton) projectPrevButton.disabled = true;
    if (projectNextButton) projectNextButton.disabled = true;
  };

  const syncProjectNavigationState = () => {
    if (projects.length > 1) return;
    if (projectPrevButton) projectPrevButton.disabled = true;
    if (projectNextButton) projectNextButton.disabled = true;
  };

  const roll = (step) => {
    const total = currentProject().images.length;

    state.target = normalizeIndex(Math.round(state.target + step), total);
    const now = performance.now();
    const gap = now - state.lastInputAt;
    state.lastInputAt = now;

    if (gap < profile.cadenceWindow) {
      state.inputStreak = Math.min(profile.streakMax, state.inputStreak + 1);
    } else {
      state.inputStreak = 1;
    }

    const cadenceBoost = 1 + state.inputStreak * profile.cadenceStep;
    state.inputEnergy = Math.min(1, state.inputEnergy * profile.energyBlend + cadenceBoost * profile.energyGain);

    const impulse = step * (profile.impulseBase + cadenceBoost * profile.impulseStep);
    state.velocity += impulse;

    startAnimation();
  };

  prevButton.addEventListener('click', () => roll(-1));
  nextButton.addEventListener('click', () => roll(1));
  projectPrevButton?.addEventListener('click', () => shiftProject(-1));
  projectNextButton?.addEventListener('click', () => shiftProject(1));

  roller.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      roll(-1);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      roll(1);
    }
  });

  projectStrip.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      shiftProject(-1);
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      shiftProject(1);
    }
  });

  const init = async () => {
    projects = getDefaultProjects();
    const hasInlineProjects = loadInlineProjects();

    if (!hasInlineProjects) {
      await loadRemoteProjects();
    }

    finalizeServiceProjects();

    if (!projects.length) {
      setGalleryDisabledState();
      return;
    }

    state.projectIndex = normalizeIndex(state.projectIndex, projects.length);
    buildProjectStrip();
    buildRoller();

    syncProjectNavigationState();
  };

  init();
})();
