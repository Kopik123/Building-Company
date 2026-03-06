(() => {
  const roller = document.querySelector('[data-gallery-roller]');
  const stage = document.querySelector('[data-gallery-stage]');
  const projectStrip = document.querySelector('[data-gallery-projects]');
  const prevButton = document.querySelector('[data-gallery-prev]');
  const nextButton = document.querySelector('[data-gallery-next]');
  const statusNode = document.querySelector('[data-gallery-status]');

  if (!roller || !stage || !projectStrip || !prevButton || !nextButton) return;

  const projects = [
    {
      name: 'Bathroom - Didsbury',
      images: ['/Gallery/IMG_20250821_155034.jpg', '/Gallery/IMG_20240628_131954.jpg', '/Gallery/IMG_20231121_084642.jpg']
    },
    {
      name: 'Kitchen - Altrincham',
      images: ['/Gallery/IMG_20250515_134752.jpg', '/Gallery/IMG_20250516_104129.jpg', '/Gallery/IMG_20250728_105932.jpg']
    },
    {
      name: 'Interior - Stockport',
      images: ['/Gallery/IMG_20250718_125837.jpg', '/Gallery/IMG_20230711_123641.jpg', '/Gallery/IMG_20240827_085437.jpg']
    },
    {
      name: 'Bathroom - Sale',
      images: ['/Gallery/IMG_20240604_163842.jpg', '/Gallery/IMG_20221018_155430.jpg', '/Gallery/IMG_20220812_110218.jpg']
    },
    {
      name: 'Renovation - Chorlton',
      images: ['/Gallery/IMG_20250821_155027.jpg', '/Gallery/IMG_20220124_090514.jpg', '/Gallery/IMG_20220407_161437.jpg']
    },
    {
      name: 'Renovation - Wilmslow',
      images: ['/Gallery/IMG_20220115_155412.jpg', '/Gallery/IMG_20211020_161312.jpg', '/Gallery/IMG_20200918_081720.jpg']
    }
  ];

  let currentProjectIndex = 0;
  let currentImageIndex = 0;
  let autoplayId = null;
  const AUTOPLAY_MS = 4500;

  const setStatus = (message) => {
    if (!statusNode) return;
    statusNode.textContent = message;
  };

  const normalize = (value, size) => {
    if (size <= 0) return 0;
    return (value % size + size) % size;
  };

  const cardTemplate = (src, label, position) => {
    const card = document.createElement('article');
    card.className = `roller-card is-${position}`;

    const image = document.createElement('img');
    image.src = src;
    image.alt = `${label} - ${position} view`;
    image.loading = 'lazy';

    const caption = document.createElement('p');
    caption.className = 'roller-caption';
    caption.textContent = label;

    card.appendChild(image);
    card.appendChild(caption);
    return card;
  };

  const renderRoller = () => {
    const project = projects[currentProjectIndex];
    const images = project.images;
    if (!images || images.length < 3) {
      setStatus('Not enough images for this project.');
      return;
    }

    const leftIndex = normalize(currentImageIndex - 1, images.length);
    const centerIndex = normalize(currentImageIndex, images.length);
    const rightIndex = normalize(currentImageIndex + 1, images.length);

    stage.innerHTML = '';
    stage.appendChild(cardTemplate(images[leftIndex], project.name, 'left'));
    stage.appendChild(cardTemplate(images[centerIndex], project.name, 'center'));
    stage.appendChild(cardTemplate(images[rightIndex], project.name, 'right'));

    setStatus(`${project.name} - ${centerIndex + 1} / ${images.length}`);
  };

  const renderProjectStrip = () => {
    projectStrip.innerHTML = '';

    projects.forEach((project, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-chip';
      if (index === currentProjectIndex) button.classList.add('is-active');
      button.setAttribute('aria-label', `Show project ${project.name}`);

      const image = document.createElement('img');
      image.src = project.images[0];
      image.alt = `${project.name} thumbnail`;
      image.loading = 'lazy';

      const label = document.createElement('span');
      label.textContent = project.name;

      button.appendChild(image);
      button.appendChild(label);

      button.addEventListener('click', () => {
        currentProjectIndex = index;
        currentImageIndex = 0;
        renderProjectStrip();
        renderRoller();
      });

      projectStrip.appendChild(button);
    });
  };

  const moveNext = () => {
    const images = projects[currentProjectIndex].images;
    currentImageIndex = normalize(currentImageIndex + 1, images.length);
    renderRoller();
  };

  const stopAutoplay = () => {
    if (!autoplayId) return;
    clearInterval(autoplayId);
    autoplayId = null;
  };

  const startAutoplay = () => {
    stopAutoplay();
    autoplayId = setInterval(() => {
      moveNext();
    }, AUTOPLAY_MS);
  };

  prevButton.addEventListener('click', () => {
    const images = projects[currentProjectIndex].images;
    currentImageIndex = normalize(currentImageIndex - 1, images.length);
    renderRoller();
  });

  nextButton.addEventListener('click', () => {
    moveNext();
  });

  roller.addEventListener('mouseenter', stopAutoplay);
  roller.addEventListener('mouseleave', startAutoplay);
  roller.addEventListener('focusin', stopAutoplay);
  roller.addEventListener('focusout', () => {
    if (!roller.contains(document.activeElement)) {
      startAutoplay();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  renderProjectStrip();
  renderRoller();
  startAutoplay();
})();
