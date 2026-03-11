(() => {
  const runtime = window.LevelLinesRuntime || {};
  const getOptimizedMedia = runtime.getOptimizedMedia || ((src) => ({ fallback: src }));
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

  if (!roller || !stage || !projectStrip || !prevButton || !nextButton) return;
  roller.setAttribute('tabindex', '0');
  projectStrip.setAttribute('tabindex', '0');

  const defaultProjects = [
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
  ];
  let projects = defaultProjects.slice();

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

  const levelLabel = (index) => `Level ${String(index + 1).padStart(2, '0')}`;

  const splitProjectName = (value) => {
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
        name: String(project?.name || '').trim() || 'Project',
        images: (Array.isArray(project?.images) ? project.images : []).map(normalizeImageItem).filter(Boolean)
      }))
      .filter((project) => project.images.length);

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

  const setStatus = () => {
    const project = currentProject();
    if (!project) return;
    const total = project.images.length;
    const centeredIndex = normalizeIndex(Math.round(state.position), total);
    const imageItem = project.images[centeredIndex];

    if (imageTitleNode) {
      imageTitleNode.textContent = imageItem?.label || 'Selected image';
    }

    if (projectTitleNode) {
      projectTitleNode.textContent = project.name;
    }

    if (projectMetaNode) {
      projectMetaNode.textContent = `${levelLabel(state.projectIndex)} | ${total} image sequence | photo ${centeredIndex + 1} of ${total}`;
    }

    if (statusNode) {
      statusNode.textContent = `${levelLabel(state.projectIndex)} / ${project.name} / ${imageItem?.label || `Photo ${centeredIndex + 1}`} / photo ${centeredIndex + 1} of ${total}`;
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

    cards.forEach((card, index) => {
      const delta = shortestDelta(state.position, index, total);
      const absDelta = Math.abs(delta);
      const visible = absDelta <= profile.visibleDistance;

      const x = delta * profile.translateX;
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
    stage.innerHTML = '';
    state.cards = [];

    project.images.forEach((imageItem, index) => {
      const card = document.createElement('article');
      card.className = 'roller-card is-hidden';
      card.dataset.index = String(index);

      const image = createResponsivePicture(imageItem.media, {
        alt: `${project.name} - ${imageItem.label}`,
        className: 'roller-picture',
        imgClassName: 'roller-image',
        loading: 'lazy',
        sizes: imageItem.media?.sizes
      });

      const caption = document.createElement('p');
      caption.className = 'roller-caption';
      caption.textContent = imageItem.label;

      card.appendChild(image);
      card.appendChild(caption);
      stage.appendChild(card);
      state.cards.push(card);
    });

    state.position = normalizePosition(state.target, project.images.length);
    state.velocity = 0;
    state.inputStreak = 0;
    state.inputEnergy = 0;

    applyTransforms();
  };

  const buildProjectStrip = () => {
    projectStrip.innerHTML = '';
    state.chips = [];

    projects.forEach((project, index) => {
      const projectName = splitProjectName(project.name);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-chip';
      button.setAttribute('aria-label', `Show project ${project.name}`);
      button.setAttribute('aria-pressed', 'false');

      const image = createResponsivePicture(project.images[0].media, {
        alt: `${project.name} thumbnail`,
        className: 'project-chip-picture',
        imgClassName: 'project-chip-image',
        loading: 'lazy',
        sizes: project.images[0].media?.thumbnailSizes || project.images[0].media?.sizes
      });

      const copy = document.createElement('div');
      copy.className = 'project-chip-copy';

      const level = document.createElement('small');
      level.className = 'project-chip-level';
      level.textContent = levelLabel(index);

      const title = document.createElement('strong');
      title.className = 'project-chip-title';
      title.textContent = projectName.title;

      const subtitle = document.createElement('span');
      subtitle.className = 'project-chip-subtitle';
      subtitle.textContent = projectName.subtitle;

      button.appendChild(image);
      copy.appendChild(level);
      copy.appendChild(title);
      copy.appendChild(subtitle);
      button.appendChild(copy);

      button.addEventListener('click', () => selectProject(index));

      projectStrip.appendChild(button);
      state.chips.push(button);
    });

    updateProjectStripState();
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
    projects = normalizeProjects(defaultProjects);
    const hasInlineProjects = loadInlineProjects();

    if (!hasInlineProjects) {
      await loadManagedProjects();
    }

    if (!projects.length) {
      if (statusNode) statusNode.textContent = 'No gallery photos available yet.';
      prevButton.disabled = true;
      nextButton.disabled = true;
      if (projectPrevButton) projectPrevButton.disabled = true;
      if (projectNextButton) projectNextButton.disabled = true;
      return;
    }

    state.projectIndex = normalizeIndex(state.projectIndex, projects.length);
    buildProjectStrip();
    buildRoller();

    if (projects.length <= 1) {
      if (projectPrevButton) projectPrevButton.disabled = true;
      if (projectNextButton) projectNextButton.disabled = true;
    }
  };

  init();
})();
