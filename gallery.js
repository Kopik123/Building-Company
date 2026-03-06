(() => {
  const roller = document.querySelector('[data-gallery-roller]');
  const stage = document.querySelector('[data-gallery-stage]');
  const projectStrip = document.querySelector('[data-gallery-projects]');
  const prevButton = document.querySelector('[data-gallery-prev]');
  const nextButton = document.querySelector('[data-gallery-next]');
  const statusNode = document.querySelector('[data-gallery-status]');

  if (!roller || !stage || !projectStrip || !prevButton || !nextButton) return;
  roller.setAttribute('tabindex', '0');

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
  let rollingTimer = null;

  const normalize = (value, size) => {
    if (size <= 0) return 0;
    return (value % size + size) % size;
  };

  const setStatus = () => {
    if (!statusNode) return;
    const project = projects[currentProjectIndex];
    const imageCount = project.images.length;
    statusNode.textContent = `${project.name} - photo ${currentImageIndex + 1} of ${imageCount}`;
  };

  const updateProjectStripState = () => {
    const chips = Array.from(projectStrip.querySelectorAll('.project-chip'));
    chips.forEach((chip, index) => {
      const isActive = index === currentProjectIndex;
      chip.classList.toggle('is-active', isActive);
      chip.setAttribute('aria-pressed', String(isActive));
    });
  };

  const applyRollerState = () => {
    const cards = Array.from(stage.querySelectorAll('.roller-card'));
    const total = cards.length;
    if (!total) return;

    const centerIndex = normalize(currentImageIndex, total);
    const leftIndex = normalize(currentImageIndex - 1, total);
    const rightIndex = normalize(currentImageIndex + 1, total);

    cards.forEach((card, index) => {
      card.classList.remove('is-center', 'is-left', 'is-right', 'is-hidden');

      if (index === centerIndex) {
        card.classList.add('is-center');
      } else if (index === leftIndex) {
        card.classList.add('is-left');
      } else if (index === rightIndex) {
        card.classList.add('is-right');
      } else {
        card.classList.add('is-hidden');
      }
    });

    setStatus();
  };

  const buildRoller = () => {
    const project = projects[currentProjectIndex];
    stage.innerHTML = '';

    project.images.forEach((src, index) => {
      const card = document.createElement('article');
      card.className = 'roller-card is-hidden';
      card.dataset.index = String(index);

      const image = document.createElement('img');
      image.src = src;
      image.alt = `${project.name} photo ${index + 1}`;
      image.loading = 'lazy';

      const caption = document.createElement('p');
      caption.className = 'roller-caption';
      caption.textContent = project.name;

      card.appendChild(image);
      card.appendChild(caption);
      stage.appendChild(card);
    });

    applyRollerState();
  };

  const buildProjectStrip = () => {
    projectStrip.innerHTML = '';

    projects.forEach((project, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-chip';
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
        updateProjectStripState();
        buildRoller();
      });

      projectStrip.appendChild(button);
    });

    updateProjectStripState();
  };

  const roll = (step) => {
    const total = projects[currentProjectIndex].images.length;
    currentImageIndex = normalize(currentImageIndex + step, total);

    stage.classList.add('is-rolling');
    applyRollerState();

    if (rollingTimer) clearTimeout(rollingTimer);
    rollingTimer = window.setTimeout(() => {
      stage.classList.remove('is-rolling');
    }, 560);
  };

  prevButton.addEventListener('click', () => roll(-1));
  nextButton.addEventListener('click', () => roll(1));

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

  buildProjectStrip();
  buildRoller();
})();
