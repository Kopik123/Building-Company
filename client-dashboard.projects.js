(() => {
  const createClientProjectsController = ({
    state,
    el,
    api,
    setStatus,
    createMutedNode,
    syncKeyedList,
    onRefreshOverview
  } = {}) => {
    if (!state || !el) return null;

    const syncProjectSelectOptions = () => {
      const select = el.uploadForm.elements.projectId;
      const existingByValue = new Map(Array.from(select.options).map((option) => [String(option.value || ''), option]));
      const entries = state.projects.length
        ? state.projects.map((project) => ({ value: project.id, label: project.title }))
        : [{ value: '', label: 'No projects' }];

      entries.forEach((entry, index) => {
        const key = String(entry.value || '');
        let option = existingByValue.get(key);
        if (!option) {
          option = document.createElement('option');
          option.value = entry.value;
        }
        option.textContent = entry.label;
        if (select.options[index] !== option) {
          select.insertBefore(option, select.options[index] || null);
        }
        existingByValue.delete(key);
      });

      existingByValue.forEach((option) => option.remove());
    };

    const createProjectCard = () => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      const heading = document.createElement('h3');
      heading.className = 'dashboard-item-title';
      const meta = document.createElement('p');
      meta.className = 'muted';
      const description = document.createElement('p');
      const docsWrap = document.createElement('div');
      docsWrap.className = 'dashboard-pill-list';
      card.appendChild(heading);
      card.appendChild(meta);
      card.appendChild(description);
      card.appendChild(docsWrap);
      return card;
    };

    const updateProjectCard = (card, project) => {
      const manager = project.assignedManager?.name || project.assignedManager?.email || 'Not assigned';
      const docsCount = Array.isArray(project.documents) ? project.documents.length : 0;
      const [heading, meta, description, docsWrap] = card.children;
      heading.textContent = project.title || 'Project';
      meta.textContent = `${project.status || '-'} | ${project.location || '-'} | Manager: ${manager} | Docs: ${docsCount}`;
      description.textContent = project.description || '';
      docsWrap.replaceChildren();
      (project.documents || []).slice(0, 5).forEach((doc) => {
        const link = document.createElement('a');
        link.className = 'btn btn-outline';
        link.href = doc.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = doc.filename;
        docsWrap.appendChild(link);
      });
    };

    const renderProjects = () => {
      syncProjectSelectOptions();

      if (!state.projects.length) {
        syncKeyedList(el.projectsList, [], {
          getKey: () => '',
          createNode: createProjectCard,
          updateNode: updateProjectCard,
          createEmptyNode: () => createMutedNode('No projects linked yet. Contact your manager.')
        });
        return;
      }

      syncKeyedList(el.projectsList, state.projects, {
        getKey: (project) => project.id,
        createNode: createProjectCard,
        updateNode: updateProjectCard,
        createEmptyNode: () => createMutedNode('No projects linked yet. Contact your manager.')
      });
    };

    const bindEvents = () => {
      el.uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const projectId = String(el.uploadForm.elements.projectId.value || '').trim();
        const files = el.uploadForm.elements.files.files;
        if (!projectId) return setStatus(el.uploadStatus, 'Select project.', 'error');
        if (!files?.length) return setStatus(el.uploadStatus, 'Select files.', 'error');

        const formData = new FormData();
        Array.from(files).forEach((file) => formData.append('files', file));
        formData.append('caption', String(el.uploadForm.elements.caption.value || '').trim());

        setStatus(el.uploadStatus, 'Uploading...');
        try {
          await api(`/api/client/projects/${projectId}/documents/upload`, { method: 'POST', body: formData });
          setStatus(el.uploadStatus, 'Documents uploaded.', 'success');
          el.uploadForm.reset();
          await onRefreshOverview?.();
        } catch (error) {
          setStatus(el.uploadStatus, error.message || 'Upload failed.', 'error');
        }
      });
    };

    return {
      renderProjects,
      syncProjectSelectOptions,
      bindEvents
    };
  };

  globalThis.LevelLinesClientProjects = {
    createClientProjectsController
  };
})();
