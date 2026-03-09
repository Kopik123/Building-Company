(() => {
  const grid = document.querySelector('[data-services-grid]');
  if (!grid) return;

  const brand = window.LEVEL_LINES_BRAND || {};
  const fallbackServices = Array.isArray(brand.services) ? brand.services : [];

  const sanitize = (value) => String(value || '').trim();

  const toManagedMap = (services) => {
    const map = new Map();

    (Array.isArray(services) ? services : []).forEach((service) => {
      const category = sanitize(service.category).toLowerCase();
      const title = sanitize(service.title).toLowerCase();
      const slug = sanitize(service.slug).toLowerCase();

      [category, title, slug].filter(Boolean).forEach((key) => {
        if (!map.has(key)) map.set(key, service);
      });
    });

    return map;
  };

  const findManagedService = (managedMap, service) => {
    const keys = [
      sanitize(service.category).toLowerCase(),
      sanitize(service.key).toLowerCase(),
      sanitize(service.title).toLowerCase()
    ].filter(Boolean);

    for (const key of keys) {
      if (managedMap.has(key)) return managedMap.get(key);
    }

    return null;
  };

  const makeCard = (service, index) => {
    const article = document.createElement('article');
    article.className = 'service-card surface-card';

    const media = document.createElement('div');
    media.className = 'service-card-media';

    const image = document.createElement('img');
    image.src = sanitize(service.image) || '/Gallery/premium/exterior-front.jpg';
    image.alt = sanitize(service.title) || 'Service';
    image.loading = 'lazy';
    media.appendChild(image);

    const body = document.createElement('div');
    body.className = 'service-card-body';

    const indexNode = document.createElement('p');
    indexNode.className = 'service-card-index';
    indexNode.textContent = String(index + 1).padStart(2, '0');

    const title = document.createElement('h3');
    title.textContent = sanitize(service.title) || 'Service';

    const desc = document.createElement('p');
    desc.textContent = sanitize(service.description) || 'Premium renovation service tailored to the project brief.';

    const link = document.createElement('a');
    link.className = 'text-link';
    link.href = sanitize(service.href) || '/index.html#consultation';
    link.textContent = sanitize(service.cta) || 'Request consultation';

    body.appendChild(indexNode);
    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(link);

    article.appendChild(media);
    article.appendChild(body);
    return article;
  };

  const render = (managedServices) => {
    if (!fallbackServices.length) return;

    const managedMap = toManagedMap(managedServices);
    const services = fallbackServices.map((service) => {
      const managed = findManagedService(managedMap, service) || {};
      return {
        ...service,
        image: sanitize(managed.heroImageUrl) || service.image,
        description: sanitize(managed.shortDescription) || service.description,
        title: service.title,
        href: service.href,
        cta: service.cta
      };
    });

    grid.innerHTML = '';
    services.forEach((service, index) => {
      grid.appendChild(makeCard(service, index));
    });
  };

  const load = async () => {
    render([]);

    try {
      const response = await fetch('/api/services', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const payload = await response.json().catch(() => ({}));
      render(payload.services);
    } catch (_error) {
      // Keep branded fallback when API fails.
    }
  };

  load();
})();
