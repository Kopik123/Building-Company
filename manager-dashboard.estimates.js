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
    const selectedEstimate = () =>
      state.estimates.find((estimate) => estimate.id === state.selectedEstimateId) || null;

    const renderEstimateLines = () => {
      el.estimateLinesList.innerHTML = '';
      const estimate = selectedEstimate();
      if (!estimate || !Array.isArray(estimate.lines) || !estimate.lines.length) {
        el.estimateLinesList.innerHTML = '<p class="muted">No line items yet.</p>';
        return;
      }

      const frag = document.createDocumentFragment();
      estimate.lines.forEach((line) => {
        const card = document.createElement('article');
        card.className = 'dashboard-item';
        card.innerHTML = `<h3>${escapeHtml(line.description)}</h3><p class="muted">${escapeHtml(line.lineType)} | qty ${escapeHtml(line.quantity)} ${escapeHtml(line.unit || '')} | GBP ${escapeHtml(Number(line.lineTotal || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</p>${line.notes ? `<p>${escapeHtml(line.notes)}</p>` : ''}`;
        const row = document.createElement('div');
        row.className = 'dashboard-actions-row';
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn btn-outline';
        del.textContent = 'Delete line';
        del.addEventListener('click', async () => {
          if (!window.confirm(`Delete estimate line "${line.description}"?`)) return;
          try {
            await api(`/api/manager/estimates/${estimate.id}/lines/${line.id}`, { method: 'DELETE' });
            await loadEstimateDetail(estimate.id, true);
            fillEstimateEditor();
            renderEstimates();
            setStatus(el.estimateLineStatus, 'Estimate line deleted.', 'success');
          } catch (error) {
            setStatus(el.estimateLineStatus, error.message || 'Failed to delete estimate line.', 'error');
          }
        });
        row.appendChild(del);
        card.appendChild(row);
        frag.appendChild(card);
      });
      el.estimateLinesList.appendChild(frag);
    };

    const fillEstimateEditor = () => {
      const estimate = selectedEstimate();
      if (!estimate) {
        el.estimateEditorCard.hidden = true;
        requestAccordionRefresh();
        return;
      }

      syncEstimateReferenceOptions();
      el.estimateEditorCard.hidden = false;
      el.estimateEditorTitle.textContent = estimate.title || 'Estimate';
      el.estimateEditorTotal.textContent = `Total GBP ${Number(estimate.total || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

    const renderEstimates = () => {
      el.estimatesList.innerHTML = '';
      if (!state.estimates.length) {
        el.estimatesList.innerHTML = '<p class="muted">No estimates created yet.</p>';
        el.estimateEditorCard.hidden = true;
        requestAccordionRefresh();
        renderOperationsShell();
        return;
      }

      const frag = document.createDocumentFragment();
      state.estimates.forEach((estimate) => {
        const card = document.createElement('article');
        card.className = `dashboard-item ${estimate.id === state.selectedEstimateId ? 'is-active' : ''}`;
        const projectTitle = estimate.project?.title || 'No project';
        card.innerHTML = `<h3>${escapeHtml(estimate.title)}</h3><p class="muted">${escapeHtml(estimate.status)} | ${escapeHtml(projectTitle)} | total GBP ${escapeHtml(Number(estimate.total || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</p>`;
        const row = document.createElement('div');
        row.className = 'dashboard-actions-row';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-outline';
        btn.textContent = 'Select';
        btn.addEventListener('click', async () => {
          state.selectedEstimateId = estimate.id;
          await loadEstimateDetail(estimate.id, true);
          fillEstimateEditor();
          renderEstimates();
        });
        row.appendChild(btn);
        card.appendChild(row);
        frag.appendChild(card);
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

    const bindEvents = () => {
      el.estimateLineForm.elements.lineType.addEventListener('change', syncEstimateLineMode);
      syncEstimateLineMode();

      el.estimateCreateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setStatus(el.estimateCreateStatus, 'Creating estimate...');
        const f = el.estimateCreateForm.elements;
        const payload = {
          title: String(f.title.value || '').trim(),
          projectId: normUuid(f.projectId.value),
          quoteId: normUuid(f.quoteId.value),
          status: String(f.status.value || 'draft'),
          notes: String(f.notes.value || '').trim()
        };
        if (!payload.title) return setStatus(el.estimateCreateStatus, 'Estimate title is required.', 'error');
        try {
          const result = await api('/api/manager/estimates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          setStatus(el.estimateCreateStatus, 'Estimate created.', 'success');
          el.estimateCreateForm.reset();
          f.status.value = 'draft';
          await loadEstimates(result.estimate?.id);
        } catch (error) {
          setStatus(el.estimateCreateStatus, error.message || 'Failed to create estimate.', 'error');
        }
      });

      el.estimateUpdateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const estimateId = String(el.estimateUpdateForm.elements.id.value || '').trim();
        if (!estimateId) return;
        setStatus(el.estimateUpdateStatus, 'Saving estimate...');
        const f = el.estimateUpdateForm.elements;
        const payload = {
          title: String(f.title.value || '').trim(),
          projectId: normUuid(f.projectId.value),
          quoteId: normUuid(f.quoteId.value),
          status: String(f.status.value || 'draft'),
          notes: String(f.notes.value || '').trim()
        };
        if (!payload.title) return setStatus(el.estimateUpdateStatus, 'Estimate title is required.', 'error');
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
      });

      el.estimateDelete.addEventListener('click', async () => {
        const estimate = selectedEstimate();
        if (!estimate) return;
        if (!window.confirm(`Delete estimate "${estimate.title}"?`)) return;
        setStatus(el.estimateUpdateStatus, 'Deleting estimate...');
        try {
          await api(`/api/manager/estimates/${estimate.id}`, { method: 'DELETE' });
          setStatus(el.estimateUpdateStatus, 'Estimate deleted.', 'success');
          await loadEstimates();
        } catch (error) {
          setStatus(el.estimateUpdateStatus, error.message || 'Failed to delete estimate.', 'error');
        }
      });

      el.estimateLineForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const estimate = selectedEstimate();
        if (!estimate) return setStatus(el.estimateLineStatus, 'Select an estimate first.', 'error');
        setStatus(el.estimateLineStatus, 'Adding estimate line...');
        const f = el.estimateLineForm.elements;
        const lineType = String(f.lineType.value || 'service');
        const payload = {
          lineType,
          serviceId: lineType === 'service' ? normUuid(f.serviceId.value) : null,
          materialId: lineType === 'material' ? normUuid(f.materialId.value) : null,
          description: String(f.description.value || '').trim(),
          unit: String(f.unit.value || '').trim(),
          quantity: Number(f.quantity.value || 1),
          unitCost: f.unitCost.value ? Number(f.unitCost.value) : null,
          lineTotalOverride: f.lineTotalOverride.value ? Number(f.lineTotalOverride.value) : null,
          notes: String(f.notes.value || '').trim()
        };
        if (lineType === 'service' && !payload.serviceId) return setStatus(el.estimateLineStatus, 'Select a service.', 'error');
        if (lineType === 'material' && !payload.materialId) return setStatus(el.estimateLineStatus, 'Select a material.', 'error');
        if (lineType === 'custom' && !payload.description) return setStatus(el.estimateLineStatus, 'Description is required for custom lines.', 'error');
        try {
          await api(`/api/manager/estimates/${estimate.id}/lines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          setStatus(el.estimateLineStatus, 'Estimate line added.', 'success');
          el.estimateLineForm.reset();
          f.lineType.value = 'service';
          f.unit.value = 'pcs';
          f.quantity.value = '1';
          syncEstimateLineMode();
          await loadEstimates(estimate.id);
        } catch (error) {
          setStatus(el.estimateLineStatus, error.message || 'Failed to add estimate line.', 'error');
        }
      });
    };

    return {
      renderEstimates,
      loadEstimates,
      loadEstimateDetail,
      loadEstimatesIfNeeded,
      bindEvents
    };
  };

  window.LevelLinesManagerEstimates = {
    createManagerEstimatesController
  };
})();
