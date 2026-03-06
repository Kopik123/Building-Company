(() => {
  const grids = document.querySelectorAll('[data-gallery-grid]');
  if (!grids.length) return;

  const statusNodes = document.querySelectorAll('[data-gallery-status]');

  const isValidImagePath = (value) => typeof value === 'string' && value.startsWith('/Gallery/');

  const setStatus = (message) => {
    statusNodes.forEach((node) => {
      node.textContent = message;
    });
  };

  const renderImages = (images) => {
    grids.forEach((grid) => {
      grid.innerHTML = '';
      images.forEach((src, index) => {
        const image = document.createElement('img');
        image.src = src;
        image.alt = `levels+lines renovation gallery image ${index + 1}`;
        image.loading = 'lazy';
        grid.appendChild(image);
      });
    });
  };

  const loadGallery = async () => {
    setStatus('Loading gallery...');

    try {
      const response = await fetch('/api/gallery', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Unable to load gallery.');

      const payload = await response.json();
      const rawImages = Array.isArray(payload) ? payload : payload && Array.isArray(payload.images) ? payload.images : [];
      const images = rawImages.filter(isValidImagePath);

      if (!images.length) {
        setStatus('Gallery will be updated soon.');
        return;
      }

      renderImages(images);
      setStatus('');
    } catch (error) {
      setStatus(error.message || 'Could not load gallery.');
    }
  };

  loadGallery();
})();
