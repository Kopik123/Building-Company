(() => {
  const createManagerEstimatesController = ({
    state,
    el,
    api,
    setStatus,
    escapeHtml,
    normUuid,
    renderOperationsShell,
    requestAccordionRefresh,
    syncEstimateReferenceOptions,
    ensureCatalogForEstimates
  }) => {
    const formatGbp = (value) => Number(value || 0).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const selectedEstimate = () =>
      state.estimates.find((estimate) => estimate.id === state.selectedEstimateId) || null;

    const renderEstimateLineEmptyState = () => {
      el.estimateLinesList.innerHTML = '<p class="muted">No line items yet.</p>';
    };

    const renderEstimateLineDescription = (line) => {
      const notesMarkup = line.notes ? `<p>${escapeHtml(line.notes)}</p>` : '';
      return `<h3>${escapeHtml(line.description)}</h3><p class="muted">${escapeHtml(line.lineType)} | qty ${escapeHtml(line.quantity)} ${escapeHtml(line.unit || '')} | GBP ${escapeHtml(formatGbp(line.lineTotal))}</p>${notesMarkup}`;
    };

    const refreshSelectedEstimateView = async (estimateId, successMessage) => {
      await loadEstimateDetail(estimateId, true);
      fillEstimateEditor();
      renderEstimates();
      if (successMessage) {
        setStatus(el.estimateLineStatus, successMessage, 'success');
      }
    };

    const confirmEstimateLineDelete = (line) => globalThis.confirm(`Delete estimate line "${line.description}"?`);

    const handleEstimateLineDelete = async (estimateId, line) => {
      if (!confirmEstimateLineDelete(line)) {
        return;
      }
      try {
        await api(`/api/manager/estimates/${estimateId}/lines/${line.id}`, { method: 'DELETE' });
        await refreshSelectedEstimateView(estimateId, 'Estimate line deleted.');
      } catch (error) {
        setStatus(el.estimateLineStatus, error.message || 'Failed to delete estimate line.', 'error');
      }
    };

    const createEstimateLineCard = (estimateId, line) => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      card.innerHTML = renderEstimateLineDescription(line);

      const row = document.createElement('div');
      row.className = 'dashboard-actions-row';
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn-outline';
      del.textContent = 'Delete line';
      del.addEventListener('click', () => {
        handleEstimateLineDelete(estimateId, line).catch(() => {});
      });
      row.appendChild(del);
      card.appendChild(row);
      return card;
    };

    const renderEstimateLines = () => {
      el.estimateLinesList.innerHTML = '';
      const estimate = selectedEstimate();
      if (!estimate || !Array.isArray(estimate.lines) || !estimate.lines.length) {
        renderEstimateLineEmptyState();
        return;
      }

      const frag = document.createDocumentFragment();
      estimate.lines.forEach((line) => {
        frag.appendChild(createEstimateLineCard(estimate.id, line));
      });
      el.estimateLinesList.appendChild(frag);
    };

    const setEstimateEditorHidden = () => {
      el.estimateEditorCard.hidden = true;
      requestAccordionRefresh();
    };

    const fillEstimateEditor = () => {
      const estimate = selectedEstimate();
      if (!estimate) {
        setEstimateEditorHidden();
        return;
      }

      syncEstimateReferenceOptions();
      el.estimateEditorCard.hidden = false;
      el.estimateEditorTitle.textContent = estimate.title || 'Estimate';
      el.estimateEditorTotal.textContent = `Total GBP ${formatGbp(estimate.total)}`;
      const form = el.estimateUpdateForm.elements;
      form.id.value = estimate.id;
      form.title.value = estimate.title || '';
      form.status.value = estimate.status || 'draft';
      form.projectId.value = estimate.projectId || '';
      form.quoteId.value = estimate.quoteId || '';
      form.notes.value = estimate.notes || '';
      renderEstimateLines();
      requestAccordionRefresh();
    };

    const renderEstimateEmptyState = () => {
      el.estimatesList.innerHTML = '<p class="muted">No estimates created yet.</p>';
      setEstimateEditorHidden();
      renderOperationsShell();
    };

    const renderEstimateSummary = (estimate) => {
      const projectTitle = estimate.project?.title || 'No project';
      return `<h3>${escapeHtml(estimate.title)}</h3><p class="muted">${escapeHtml(estimate.status)} | ${escapeHtml(projectTitle)} | total GBP ${escapeHtml(formatGbp(estimate.total))}</p>`;
    };

    const handleEstimateSelection = async (estimateId) => {
      state.selectedEstimateId = estimateId;
      await loadEstimateDetail(estimateId, true);
      fillEstimateEditor();
      renderEstimates();
    };

    const createEstimateCard = (estimate) => {
      const card = document.createElement('article');
      card.className = `dashboard-item ${estimate.id === state.selectedEstimateId ? 'is-active' : ''}`;
      card.innerHTML = renderEstimateSummary(estimate);
      const row = document.createElement('div');
      row.className = 'dashboard-actions-row';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline';
      btn.textContent = 'Select';
      btn.addEventListener('click', () => {
        handleEstimateSelection(estimate.id).catch(() => {});
      });
      row.appendChild(btn);
      card.appendChild(row);
      return card;
    };

    const renderEstimates = () => {
      el.estimatesList.innerHTML = '';
      if (!state.estimates.length) {
        renderEstimateEmptyState();
        return;
      }

      const frag = document.createDocumentFragment();
      state.estimates.forEach((estimate) => {
        frag.appendChild(createEstimateCard(estimate));
      });
      el.estimatesList.appendChild(frag);
      renderOperationsShell();
    };

    const loadEstimateDetail = async (estimateId, force = false) => {
      const id = String(estimateId || '').trim();
      if (!id) return null;
      const existing = state.estimates.find((estimate) => estimate.id === id);
      if (existing && Array.isArray(existing.lines) && !force) {
        return existing;
      }

      const payload = await api(`/api/manager/estimates/${id}`);
      const estimate = payload?.estimate || null;
      if (!estimate?.id) return null;
      const index = state.estimates.findIndex((item) => item.id === estimate.id);
      if (index >= 0) {
        state.estimates.splice(index, 1, estimate);
      } else {
        state.estimates.unshift(estimate);
      }
      return estimate;
    };

    const loadEstimates = async (selectedId) => {
      const payload = await api('/api/manager/estimates?pageSize=100');
      state.estimates = Array.isArray(payload.estimates) ? payload.estimates : [];
      if (selectedId) state.selectedEstimateId = selectedId;
      if (!state.estimates.some((estimate) => estimate.id === state.selectedEstimateId)) {
        state.selectedEstimateId = state.estimates[0]?.id || '';
      }
      if (state.selectedEstimateId) {
        await loadEstimateDetail(state.selectedEstimateId, true);
      }
      fillEstimateEditor();
      renderEstimates();
    };

    const loadEstimatesIfNeeded = async () => {
      if (state.lazyLoaded.estimates) return;
      state.lazyLoaded.estimates = true;
      await ensureCatalogForEstimates();
      await loadEstimates();
    };

    const syncEstimateLineMode = () => {
      const form = el.estimateLineForm?.elements;
      if (!form) return;
      const lineType = String(form.lineType.value || 'service');
      form.serviceId.disabled = lineType !== 'service';
      form.materialId.disabled = lineType !== 'material';
    };

    const buildEstimatePayload = (form) => ({
      title: String(form.title.value || '').trim(),
      projectId: normUuid(form.projectId.value),
      quoteId: normUuid(form.quoteId.value),
      status: String(form.status.value || 'draft'),
      notes: String(form.notes.value || '').trim()
    });

    const hasEstimateTitle = (payload, statusElement, errorMessage) => {
      if (payload.title) {
        return true;
      }
      setStatus(statusElement, errorMessage, 'error');
      return false;
    };

    const resetEstimateCreateForm = (form) => {
      el.estimateCreateForm.reset();
      form.status.value = 'draft';
    };

    const handleEstimateCreateSubmit = async (event) => {
      event.preventDefault();
      setStatus(el.estimateCreateStatus, 'Creating estimate...');
      const form = el.estimateCreateForm.elements;
      const payload = buildEstimatePayload(form);
      if (!hasEstimateTitle(payload, el.estimateCreateStatus, 'Estimate title is required.')) {
        return;
      }
      try {
        const result = await api('/api/manager/estimates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        setStatus(el.estimateCreateStatus, 'Estimate created.', 'success');
        resetEstimateCreateForm(form);
        await loadEstimates(result.estimate?.id);
      } catch (error) {
        setStatus(el.estimateCreateStatus, error.message || 'Failed to create estimate.', 'error');
      }
    };

    const getSelectedEstimateIdFromForm = () => String(el.estimateUpdateForm.elements.id.value || '').trim();

    const handleEstimateUpdateSubmit = async (event) => {
      event.preventDefault();
      const estimateId = getSelectedEstimateIdFromForm();
      if (!estimateId) {
        return;
      }
      setStatus(el.estimateUpdateStatus, 'Saving estimate...');
      const form = el.estimateUpdateForm.elements;
      const payload = buildEstimatePayload(form);
      if (!hasEstimateTitle(payload, el.estimateUpdateStatus, 'Estimate title is required.')) {
        return;
      }
      try {
        await api(`/api/manager/estimates/${estimateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        setStatus(el.estimateUpdateStatus, 'Estimate saved.', 'success');
        await loadEstimates(estimateId);
      } catch (error) {
        setStatus(el.estimateUpdateStatus, error.message || 'Failed to save estimate.', 'error');
      }
    };

    const confirmEstimateDelete = (estimate) => globalThis.confirm(`Delete estimate "${estimate.title}"?`);

    const handleEstimateDelete = async () => {
      const estimate = selectedEstimate();
      if (!estimate || !confirmEstimateDelete(estimate)) {
        return;
      }
      setStatus(el.estimateUpdateStatus, 'Deleting estimate...');
      try {
        await api(`/api/manager/estimates/${estimate.id}`, { method: 'DELETE' });
        setStatus(el.estimateUpdateStatus, 'Estimate deleted.', 'success');
        await loadEstimates();
      } catch (error) {
        setStatus(el.estimateUpdateStatus, error.message || 'Failed to delete estimate.', 'error');
      }
    };

    const buildEstimateLinePayload = (form) => {
      const lineType = String(form.lineType.value || 'service');
      return {
        lineType,
        serviceId: lineType === 'service' ? normUuid(form.serviceId.value) : null,
        materialId: lineType === 'material' ? normUuid(form.materialId.value) : null,
        description: String(form.description.value || '').trim(),
        unit: String(form.unit.value || '').trim(),
        quantity: Number(form.quantity.value || 1),
        unitCost: form.unitCost.value ? Number(form.unitCost.value) : null,
        lineTotalOverride: form.lineTotalOverride.value ? Number(form.lineTotalOverride.value) : null,
        notes: String(form.notes.value || '').trim()
      };
    };

    const validateEstimateLinePayload = (payload) => {
      if (payload.lineType === 'service' && !payload.serviceId) {
        return 'Select a service.';
      }
      if (payload.lineType === 'material' && !payload.materialId) {
        return 'Select a material.';
      }
      if (payload.lineType === 'custom' && !payload.description) {
        return 'Description is required for custom lines.';
      }
      return '';
    };

    const resetEstimateLineForm = (form) => {
      el.estimateLineForm.reset();
      form.lineType.value = 'service';
      form.unit.value = 'pcs';
      form.quantity.value = '1';
      syncEstimateLineMode();
    };

    const handleEstimateLineSubmit = async (event) => {
      event.preventDefault();
      const estimate = selectedEstimate();
      if (!estimate) {
        setStatus(el.estimateLineStatus, 'Select an estimate first.', 'error');
        return;
      }
      setStatus(el.estimateLineStatus, 'Adding estimate line...');
      const form = el.estimateLineForm.elements;
      const payload = buildEstimateLinePayload(form);
      const validationMessage = validateEstimateLinePayload(payload);
      if (validationMessage) {
        setStatus(el.estimateLineStatus, validationMessage, 'error');
        return;
      }
      try {
        await api(`/api/manager/estimates/${estimate.id}/lines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        setStatus(el.estimateLineStatus, 'Estimate line added.', 'success');
        resetEstimateLineForm(form);
        await loadEstimates(estimate.id);
      } catch (error) {
        setStatus(el.estimateLineStatus, error.message || 'Failed to add estimate line.', 'error');
      }
    };

    const bindEvents = () => {
      el.estimateLineForm.elements.lineType.addEventListener('change', syncEstimateLineMode);
      syncEstimateLineMode();
      el.estimateCreateForm.addEventListener('submit', handleEstimateCreateSubmit);
      el.estimateUpdateForm.addEventListener('submit', handleEstimateUpdateSubmit);
      el.estimateDelete.addEventListener('click', () => {
        handleEstimateDelete().catch(() => {});
      });
      el.estimateLineForm.addEventListener('submit', handleEstimateLineSubmit);
    };

    return {
      renderEstimates,
      loadEstimates,
      loadEstimateDetail,
      loadEstimatesIfNeeded,
      bindEvents
    };
  };

  globalThis.LevelLinesManagerEstimates = {
    createManagerEstimatesController
  };
})();
