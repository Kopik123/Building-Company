(() => {
  const createManagerProjectsController = ({
    state,
    el,
    api,
    buildQuery,
    syncKeyedList,
    createMutedNode,
    renderPagination,
    setStatus,
    setSmallStatus,
    requestAccordionRefresh,
    escapeHtml,
    normUuid,
    normEmail,
    toDateInputValue,
    renderOperationsShell,
    requestManagerWorkflowRender,
    syncEstimateReferenceOptions,
    scrollToSection,
    onProjectsChanged
  }) => {
    const selectedProject = () =>
      state.projectDetailsById.get(state.selectedProjectId)
      || state.projects.find((project) => project.id === state.selectedProjectId)
      || null;

    const renderProjects = () => {
      if (!state.projects.length) {
        syncKeyedList(el.projectsList, [], {
          getKey: () => '',
          createNode: createProjectListCard,
          updateNode: () => {},
          createEmptyNode: () => createMutedNode('No projects found for current filters.')
        });
        el.projectEditorCard.hidden = true;
        renderOperationsShell();
        requestManagerWorkflowRender();
        return;
      }

      syncKeyedList(el.projectsList, state.projects, {
        getKey: (project) => project.id,
        createNode: createProjectListCard,
        updateNode: (card, project) => {
          card.dataset.projectId = project.id;
          card.className = `dashboard-item ${project.id === state.selectedProjectId ? 'is-active' : ''}`;
          card.children[0].textContent = project.title || 'Project';
          const detailParts = [
            project.status || '-',
            project.projectStage || 'briefing',
            project.location || 'No location',
            project.currentMilestone || 'No milestone',
            project.dueDate ? `Due ${project.dueDate}` : 'No due date',
            `${project.imageCount || 0} images/${project.documentCount || 0} docs`,
            `Client: ${project.client?.email || 'No client'}`,
            `Staff: ${project.assignedManager?.email || 'No staff'}`
          ];
          card.children[1].textContent = detailParts.join(' | ');
        },
        createEmptyNode: () => createMutedNode('No projects found for current filters.')
      });

      renderPagination(el.projectsPagination, el.projectsPrev, el.projectsNext, state.projectsPagination);
      renderOperationsShell();
      requestManagerWorkflowRender();
    };

    const renderMedia = () => {
      el.mediaList.innerHTML = '';
      const project = selectedProject();
      if (!project) return;

      const media = Array.isArray(project.media) ? project.media : [];
      if (!media.length) {
        el.mediaList.innerHTML = '<p class="muted">No media uploaded for this project.</p>';
        return;
      }

      const frag = document.createDocumentFragment();
      media.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'dashboard-media-item';
        card.innerHTML = `<div class="dashboard-media-top"><strong>${escapeHtml(item.filename)}</strong><span class="muted">${escapeHtml(item.mediaType)}</span></div>`;

        const row = document.createElement('div');
        row.className = 'dashboard-actions-row';

        const openLink = document.createElement('a');
        openLink.href = item.url;
        openLink.target = '_blank';
        openLink.rel = 'noopener noreferrer';
        openLink.className = 'btn btn-outline';
        openLink.textContent = 'Open';

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn btn-outline';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', async () => {
          if (!window.confirm(`Delete file "${item.filename}"?`)) return;
          try {
            await api(`/api/manager/projects/${project.id}/media/${item.id}`, { method: 'DELETE' });
            await loadProjects(project.id);
            setStatus(el.mediaUploadStatus, 'Media deleted.', 'success');
          } catch (error) {
            setStatus(el.mediaUploadStatus, error.message || 'Failed to delete media.', 'error');
          }
        });

        row.appendChild(openLink);
        row.appendChild(deleteButton);
        card.appendChild(row);
        frag.appendChild(card);
      });

      el.mediaList.appendChild(frag);
    };

    const fillProjectEditor = () => {
      const project = selectedProject();
      if (!project) {
        el.projectEditorCard.hidden = true;
        requestAccordionRefresh();
        return;
      }

      const form = el.projectEditForm.elements;
      el.projectEditorCard.hidden = false;
      form.id.value = project.id;
      form.title.value = project.title || '';
      form.location.value = project.location || '';
      form.status.value = project.status || 'planning';
      if (form.projectStage) form.projectStage.value = project.projectStage || 'briefing';
      form.quoteId.value = project.quoteId || '';
      form.clientEmail.value = project.client?.email || '';
      form.assignedManagerEmail.value = project.assignedManager?.email || '';
      form.galleryOrder.value = Number.isFinite(project.galleryOrder) ? project.galleryOrder : 0;
      form.budgetEstimate.value = project.budgetEstimate || '';
      if (form.currentMilestone) form.currentMilestone.value = project.currentMilestone || '';
      if (form.workPackage) form.workPackage.value = project.workPackage || '';
      form.startDate.value = toDateInputValue(project.startDate);
      form.endDate.value = toDateInputValue(project.endDate);
      if (form.dueDate) form.dueDate.value = toDateInputValue(project.dueDate);
      form.showInGallery.checked = Boolean(project.showInGallery);
      form.isActive.checked = Boolean(project.isActive);
      form.description.value = project.description || '';
      setSmallStatus(el.projectEditClientLookupStatus, '', '');
      setSmallStatus(el.projectEditManagerLookupStatus, '', '');
      renderMedia();
      requestManagerWorkflowRender();
      requestAccordionRefresh();
    };

    const loadProjectDetail = async (projectId, force = false) => {
      const id = String(projectId || '').trim();
      if (!id) return null;
      if (!force && state.projectDetailsById.has(id)) {
        return state.projectDetailsById.get(id);
      }

      const payload = await api(`/api/manager/projects/${id}`);
      const project = payload?.project || null;
      if (project && project.id) {
        state.projectDetailsById.set(project.id, project);
        return project;
      }

      state.projectDetailsById.delete(id);
      return null;
    };

    const loadProjects = async (selectedId) => {
      const payload = await api(`/api/manager/projects?${buildQuery({
        includeMedia: false,
        page: state.projectsQuery.page,
        pageSize: state.projectsQuery.pageSize,
        q: state.projectsQuery.q,
        status: state.projectsQuery.status,
        projectStage: state.projectsQuery.projectStage,
        clientEmail: state.projectsQuery.clientEmail,
        assignedManagerEmail: state.projectsQuery.assignedManagerEmail,
        showInGallery: state.projectsQuery.showInGallery
      })}`);

      state.projects = Array.isArray(payload.projects) ? payload.projects : [];
      state.projectsPagination = payload.pagination || state.projectsPagination;
      if (selectedId) state.selectedProjectId = selectedId;
      if (!state.projects.some((project) => project.id === state.selectedProjectId)) {
        state.selectedProjectId = state.projects[0]?.id || '';
      }

      const visibleProjectIds = new Set(state.projects.map((project) => project.id));
      Array.from(state.projectDetailsById.keys()).forEach((projectId) => {
        if (!visibleProjectIds.has(projectId)) {
          state.projectDetailsById.delete(projectId);
        }
      });

      if (state.selectedProjectId) {
        await loadProjectDetail(state.selectedProjectId, Boolean(selectedId));
      }

      renderProjects();
      fillProjectEditor();
      syncEstimateReferenceOptions();
      if (typeof onProjectsChanged === 'function') onProjectsChanged(state.projects);
    };

    const applyProjectsFiltersFromUI = () => {
      state.projectsQuery.q = String(el.projectsFilterQ.value || '').trim();
      state.projectsQuery.status = String(el.projectsFilterStatus.value || '').trim();
      state.projectsQuery.projectStage = String(el.projectsFilterStage?.value || '').trim();
      state.projectsQuery.clientEmail = String(el.projectsFilterClient?.value || '').trim();
      state.projectsQuery.assignedManagerEmail = String(el.projectsFilterOwner?.value || '').trim();
      state.projectsQuery.showInGallery = String(el.projectsFilterGallery.value || '').trim();
      state.projectsQuery.pageSize = Number.parseInt(el.projectsPageSize.value, 10) || 25;
      state.projectsQuery.page = 1;
    };

    const openProjectEditor = () => {
      if (!state.selectedProjectId) {
        setStatus(el.projectEditStatus, 'Select a project from the list first, then edit it here.', 'error');
        scrollToSection('manager-projects-section', el.projectsFilterQ);
        return;
      }

      fillProjectEditor();
      if (el.projectEditorCard.hidden) el.projectEditorCard.hidden = false;
      scrollToSection('project-editor-card', el.projectEditForm?.elements?.title);
    };

    const createProjectListCard = () => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      const heading = document.createElement('h3');
      heading.className = 'dashboard-item-title';
      const meta = document.createElement('p');
      meta.className = 'muted';
      const row = document.createElement('div');
      row.className = 'dashboard-actions-row';
      const selectButton = document.createElement('button');
      selectButton.type = 'button';
      selectButton.className = 'btn btn-outline';
      selectButton.textContent = 'Select';
      selectButton.addEventListener('click', async () => {
        const projectId = card.dataset.projectId || '';
        if (!projectId) return;
        state.selectedProjectId = projectId;
        if (!state.projectDetailsById.has(projectId)) {
          try {
            await loadProjectDetail(projectId, true);
          } catch (error) {
            window.alert(error.message || 'Could not load project details');
          }
        }
        fillProjectEditor();
        renderProjects();
      });
      row.appendChild(selectButton);
      card.appendChild(heading);
      card.appendChild(meta);
      card.appendChild(row);
      return card;
    };

    const bindEvents = () => {
      el.projectCreateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setStatus(el.projectCreateStatus, 'Creating project...');
        const form = el.projectCreateForm.elements;
        const payload = {
          title: String(form.title.value || '').trim(),
          location: String(form.location.value || '').trim(),
          status: String(form.status.value || 'planning'),
          projectStage: String(form.projectStage?.value || 'briefing').trim(),
          quoteId: normUuid(form.quoteId.value),
          clientEmail: normEmail(form.clientEmail.value),
          assignedManagerEmail: normEmail(form.assignedManagerEmail.value),
          galleryOrder: Number.parseInt(form.galleryOrder.value, 10) || 0,
          currentMilestone: String(form.currentMilestone?.value || '').trim(),
          workPackage: String(form.workPackage?.value || '').trim(),
          budgetEstimate: String(form.budgetEstimate?.value || '').trim(),
          startDate: form.startDate?.value || null,
          endDate: form.endDate?.value || null,
          dueDate: form.dueDate?.value || null,
          description: String(form.description.value || '').trim(),
          showInGallery: Boolean(form.showInGallery.checked),
          isActive: Boolean(form.isActive?.checked ?? true)
        };
        if (!payload.title) return setStatus(el.projectCreateStatus, 'Title is required.', 'error');
        try {
          const result = await api('/api/manager/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          setStatus(el.projectCreateStatus, 'Project created.', 'success');
          el.projectCreateForm.reset();
          form.status.value = 'planning';
          if (form.projectStage) form.projectStage.value = 'briefing';
          form.galleryOrder.value = '0';
          if (form.isActive) form.isActive.checked = true;
          applyProjectsFiltersFromUI();
          await loadProjects(result.project?.id);
        } catch (error) {
          setStatus(el.projectCreateStatus, error.message || 'Failed to create project.', 'error');
        }
      });

      el.projectEditForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const projectId = String(el.projectEditForm.elements.id.value || '');
        if (!projectId) return;
        setStatus(el.projectEditStatus, 'Saving project...');
        const form = el.projectEditForm.elements;
        const payload = {
          title: String(form.title.value || '').trim(),
          location: String(form.location.value || '').trim(),
          status: String(form.status.value || 'planning'),
          projectStage: String(form.projectStage?.value || 'briefing').trim(),
          quoteId: normUuid(form.quoteId.value),
          clientEmail: normEmail(form.clientEmail.value),
          assignedManagerEmail: normEmail(form.assignedManagerEmail.value),
          galleryOrder: Number.parseInt(form.galleryOrder.value, 10) || 0,
          currentMilestone: String(form.currentMilestone?.value || '').trim(),
          workPackage: String(form.workPackage?.value || '').trim(),
          budgetEstimate: String(form.budgetEstimate.value || '').trim(),
          startDate: form.startDate.value || null,
          endDate: form.endDate.value || null,
          dueDate: form.dueDate?.value || null,
          showInGallery: Boolean(form.showInGallery.checked),
          isActive: Boolean(form.isActive.checked),
          description: String(form.description.value || '').trim()
        };
        if (!payload.title) return setStatus(el.projectEditStatus, 'Title is required.', 'error');
        try {
          await api(`/api/manager/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          setStatus(el.projectEditStatus, 'Project saved.', 'success');
          await loadProjects(projectId);
        } catch (error) {
          setStatus(el.projectEditStatus, error.message || 'Failed to save project.', 'error');
        }
      });

      el.projectDelete.addEventListener('click', async () => {
        const project = selectedProject();
        if (!project) return;
        if (!window.confirm(`Delete project "${project.title}" and all related media?`)) return;
        setStatus(el.projectEditStatus, 'Deleting project...');
        try {
          await api(`/api/manager/projects/${project.id}`, { method: 'DELETE' });
          setStatus(el.projectEditStatus, 'Project deleted.', 'success');
          await loadProjects();
        } catch (error) {
          setStatus(el.projectEditStatus, error.message || 'Failed to delete project.', 'error');
        }
      });

      el.mediaUploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const project = selectedProject();
        if (!project) return;
        const files = el.mediaUploadForm.elements.files.files;
        if (!files || !files.length) return setStatus(el.mediaUploadStatus, 'Select at least one file.', 'error');
        const payload = new FormData();
        Array.from(files).forEach((file) => payload.append('files', file));
        const mediaType = String(el.mediaUploadForm.elements.mediaType.value || '').trim();
        if (mediaType) payload.append('mediaType', mediaType);
        payload.append('galleryOrderStart', String(Number.parseInt(el.mediaUploadForm.elements.galleryOrderStart.value, 10) || 0));
        payload.append('caption', String(el.mediaUploadForm.elements.caption.value || '').trim());
        payload.append('showInGallery', String(Boolean(el.mediaUploadForm.elements.showInGallery.checked)));
        payload.append('isCover', String(Boolean(el.mediaUploadForm.elements.isCover.checked)));
        try {
          await api(`/api/manager/projects/${project.id}/media/upload`, { method: 'POST', body: payload });
          setStatus(el.mediaUploadStatus, 'Upload finished.', 'success');
          el.mediaUploadForm.reset();
          el.mediaUploadForm.elements.galleryOrderStart.value = '0';
          await loadProjects(project.id);
        } catch (error) {
          setStatus(el.mediaUploadStatus, error.message || 'Upload failed.', 'error');
        }
      });

      el.projectsFilterApply.addEventListener('click', () => {
        applyProjectsFiltersFromUI();
        loadProjects().catch((error) => window.alert(error.message || 'Could not load projects'));
      });
      el.projectsPrev.addEventListener('click', () => {
        if (state.projectsQuery.page <= 1) return;
        state.projectsQuery.page -= 1;
        loadProjects().catch((error) => window.alert(error.message || 'Could not load projects'));
      });
      el.projectsNext.addEventListener('click', () => {
        if (state.projectsQuery.page >= Number(state.projectsPagination.totalPages || 1)) return;
        state.projectsQuery.page += 1;
        loadProjects().catch((error) => window.alert(error.message || 'Could not load projects'));
      });
    };

    return {
      selectedProject,
      renderProjects,
      renderMedia,
      fillProjectEditor,
      loadProjectDetail,
      loadProjects,
      applyProjectsFiltersFromUI,
      openProjectEditor,
      bindEvents
    };
  };

  window.LevelLinesManagerProjects = {
    createManagerProjectsController
  };
})();
