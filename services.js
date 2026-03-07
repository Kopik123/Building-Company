(() => {
  const grid = document.querySelector('[data-services-grid]');
  if (!grid) return;

  const sanitize = (value) => String(value || '').trim();

  const makeCard = (service) => {
    const article = document.createElement('article');
    article.className = 'service-card card';

    const image = document.createElement('img');
    image.src = sanitize(service.heroImageUrl) || '/Gallery/premium/exterior-front.jpg';
    image.alt = sanitize(service.title) || 'Service';
    image.loading = 'lazy';

    const title = document.createElement('h3');
    title.textContent = sanitize(service.title) || 'Service';

    const desc = document.createElement('p');
    desc.textContent = sanitize(service.shortDescription) || 'Design-led renovation service tailored to project goals.';

    const link = document.createElement('a');
    link.className = 'text-link';
    link.href = '#consultation';
    link.textContent = 'Request consultation';

    article.appendChild(image);
    article.appendChild(title);
    article.appendChild(desc);
    article.appendChild(link);
    return article;
  };

  const render = (services) => {
    const list = Array.isArray(services) ? services.filter((item) => sanitize(item.title)) : [];
    if (!list.length) return;

    grid.innerHTML = '';
    list.slice(0, 6).forEach((service) => {
      grid.appendChild(makeCard(service));
    });
  };

  const load = async () => {
    try {
      const response = await fetch('/api/services', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const payload = await response.json().catch(() => ({}));
      render(payload.services);
    } catch (_error) {
      // Keep static service cards when API fails.
    }
  };

  load();
})();
