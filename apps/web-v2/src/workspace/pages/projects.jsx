import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { v2Api } from '../../lib/api';
import {
  CLIENT_LIFECYCLE_STATUSES,
  ESTIMATE_DECISION_STATUSES,
  MATERIAL_CATEGORIES,
  QUOTE_CONTACT_METHODS,
  PROJECT_STATUSES,
  PROJECT_STAGES,
  QUOTE_PRIORITIES,
  QUOTE_PROJECT_TYPES,
  QUOTE_STATUSES,
  QUOTE_WORKFLOW_STATUSES,
  SERVICE_CATEGORIES,
  STAFF_CREATION_ROLES,
  STAFF_ROLES,
  roleLabels,
  roleDescriptions,
  activeProjectStatuses,
  openQuoteStatuses,
  MAX_QUOTE_PHOTO_FILES,
  FINAL_PROJECT_STAGE,
  createEmptyOverviewSummary,
  isStaffRole,
  normalizeText,
  titleCase,
  formatDateTime,
  formatActivityTitle,
  formatActivityMessage,
  formatActivityMeta,
  getActivityTone,
  compactNumber,
  getTimestamp,
  sortByRecent,
  getThreadTitle,
  getThreadMeta,
  getThreadPreview,
  getDirectCounterparty,
  getDirectThreadTitle,
  getDirectThreadPreview,
  getDirectThreadMeta,
  getNotificationTone,
  getPriorityTone,
  updateThreadAfterSend,
  updateDirectThreadAfterSend,
  toInputValue,
  createProjectFormState,
  projectToFormState,
  createQuoteFormState,
  quoteToFormState,
  createStaffFormState,
  createClientEditorState,
  clientToFormState,
  createStaffEditorState,
  staffToFormState,
  createServiceFormState,
  serviceToFormState,
  createMaterialFormState,
  materialToFormState,
  toNullablePayload,
  toNumberPayload,
  formatMoney,
  getNextProjectStage,
  getEstimateHistoryLabel,
  getEstimateCardSummary,
  getSelectedFileKey,
  mergeSelectedFiles,
  getRemainingQuotePhotoSlots,
  validateQuotePhotoSelection,
  createEstimateFormState,
  useAsyncState,
  Surface,
  MetricCard,
  EmptyState,
  StatusPill,
  QuickLinkCard,
  SelectableCard,
  ProjectCard,
  QuoteCard,
  EstimateCard,
  QuoteEventRow,
  ThreadRow,
  DirectThreadRow,
  MessageBubble,
  QuoteAttachmentList,
  NotificationRow
} from '../kit.jsx';

function ProjectsPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'client');
  const staffMode = isStaffRole(role);
  const canReassignProjectOwner = role === 'manager' || role === 'admin';
  const projects = useAsyncState(() => v2Api.getProjects(), [], []);
  const clients = useAsyncState(() => (staffMode ? v2Api.getCrmClients() : Promise.resolve([])), [staffMode], []);
  const staff = useAsyncState(() => (staffMode ? v2Api.getCrmStaff() : Promise.resolve([])), [staffMode], []);
  const quotes = useAsyncState(() => (staffMode ? v2Api.getQuotes() : Promise.resolve([])), [staffMode], []);
  const [search, setSearch] = React.useState('');
  const [selectedProjectId, setSelectedProjectId] = React.useState('');
  const [isCreatingNew, setIsCreatingNew] = React.useState(false);
  const [form, setForm] = React.useState(() => createProjectFormState({ assignedManagerId: user?.id || '' }));
  const [saving, setSaving] = React.useState(false);
  const [actionError, setActionError] = React.useState('');
  const [actionMessage, setActionMessage] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);

  const filteredProjects = sortByRecent(projects.data, ['updatedAt', 'endDate', 'startDate', 'createdAt']).filter((project) => {
    const needle = normalizeText(deferredSearch);
    if (!needle) return true;
    return [
      project?.title,
      project?.location,
      project?.description,
      project?.status,
      project?.projectStage,
      project?.currentMilestone,
      project?.workPackage,
      project?.dueDate,
      project?.client?.email,
      project?.assignedManager?.email
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  React.useEffect(() => {
    if (!staffMode || isCreatingNew) return;
    if (!filteredProjects.length) {
      if (selectedProjectId) setSelectedProjectId('');
      return;
    }
    if (!filteredProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(filteredProjects[0].id);
    }
  }, [filteredProjects, selectedProjectId, isCreatingNew, staffMode]);

  React.useEffect(() => {
    if (!staffMode || isCreatingNew) return;
    const selectedProject = projects.data.find((project) => project.id === selectedProjectId);
    if (!selectedProject) return;
    setForm(projectToFormState(selectedProject));
  }, [selectedProjectId, projects.data, isCreatingNew, staffMode]);

  const selectedProject = projects.data.find((project) => project.id === selectedProjectId) || null;
  const projectActivity = useAsyncState(
    () => (staffMode && selectedProjectId ? v2Api.getProjectActivity(selectedProjectId, { pageSize: 8 }) : Promise.resolve([])),
    [staffMode, selectedProjectId],
    []
  );

  const onFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const syncSavedProject = async (savedProject, successMessage) => {
    const hydratedProject = savedProject?.id ? await v2Api.getProject(savedProject.id) : savedProject;
    if (!hydratedProject?.id) throw new Error('Project response missing payload');

    projects.setData((prev) =>
      sortByRecent(
        [hydratedProject, ...prev.filter((project) => project.id !== hydratedProject.id)],
        ['updatedAt', 'endDate', 'startDate', 'createdAt']
      )
    );
    setIsCreatingNew(false);
    setSelectedProjectId(hydratedProject.id);
    setForm(projectToFormState(hydratedProject));
    setActionMessage(successMessage);
    return hydratedProject;
  };

  const startNewProject = () => {
    setIsCreatingNew(true);
    setSelectedProjectId('');
    setForm(createProjectFormState({ assignedManagerId: user?.id || '' }));
    setActionError('');
    setActionMessage('');
  };

  const selectProject = (project) => {
    setIsCreatingNew(false);
    setSelectedProjectId(project.id);
    setForm(projectToFormState(project));
    setActionError('');
    setActionMessage('');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setActionError('');
    setActionMessage('');

    try {
      const payload = {
        title: String(form.title || '').trim(),
        location: toNullablePayload(form.location),
        description: toNullablePayload(form.description),
        status: form.status,
        projectStage: form.projectStage,
        clientId: form.clientId || null,
        assignedManagerId: form.assignedManagerId || null,
        quoteId: form.quoteId || null,
        acceptedEstimateId: form.acceptedEstimateId || null,
        currentMilestone: toNullablePayload(form.currentMilestone),
        workPackage: toNullablePayload(form.workPackage),
        budgetEstimate: toNullablePayload(form.budgetEstimate),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        dueDate: form.dueDate || null,
        showInGallery: Boolean(form.showInGallery),
        galleryOrder: toNumberPayload(form.galleryOrder, 0),
        isActive: Boolean(form.isActive)
      };

      const savedProject = selectedProjectId
        ? await v2Api.updateProject(selectedProjectId, payload)
        : await v2Api.createProject(payload);
      await syncSavedProject(savedProject, selectedProjectId ? 'Project saved.' : 'Project created.');
    } catch (error) {
      setActionError(error.message || 'Could not save project');
    } finally {
      setSaving(false);
    }
  };

  const applyProjectPatch = async (patch, successMessage) => {
    if (!selectedProjectId || saving) return;

    setSaving(true);
    setActionError('');
    setActionMessage('');
    try {
      const savedProject = await v2Api.updateProject(selectedProjectId, patch);
      await syncSavedProject(savedProject, successMessage);
    } catch (error) {
      setActionError(error.message || 'Could not update project');
    } finally {
      setSaving(false);
    }
  };

  const archiveProject = () => applyProjectPatch({
    isActive: false,
    showInGallery: false
  }, 'Project archived.');

  const restoreProject = () => applyProjectPatch({
    isActive: true
  }, 'Project restored.');

  const setProjectLifecycleStatus = (status) => () => applyProjectPatch({
    status
  }, `Project moved to ${titleCase(status)}.`);

  const advanceProjectStage = () => {
    const nextStage = getNextProjectStage(selectedProject?.projectStage);
    if (!nextStage) return;
    applyProjectPatch({
      projectStage: nextStage
    }, `Project stage moved to ${titleCase(nextStage)}.`);
  };

  const deleteProject = async () => {
    if (!selectedProjectId || saving) return;
    if (globalThis.confirm && !globalThis.confirm('Delete this project permanently? This only works for projects without linked delivery records.')) {
      return;
    }

    setSaving(true);
    setActionError('');
    setActionMessage('');

    try {
      await v2Api.deleteProject(selectedProjectId);
      projects.setData((prev) => prev.filter((project) => project.id !== selectedProjectId));
      setSelectedProjectId('');
      setIsCreatingNew(true);
      setForm(createProjectFormState({ assignedManagerId: user?.id || '' }));
      setActionMessage('Project deleted.');
    } catch (error) {
      setActionError(error.message || 'Could not delete project');
    } finally {
      setSaving(false);
    }
  };

  if (!staffMode) {
    return (
      <Surface
        eyebrow="Projects"
        title="Project board"
        description="Current v2 project summaries with status, location and media counts."
        actions={
          <label className="inline-search">
            <span>Filter</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project, location or status" />
          </label>
        }
      >
        {projects.loading ? <p className="muted">Loading projects...</p> : null}
        {projects.error ? <p className="error">{projects.error}</p> : null}
        {!projects.loading && !projects.error && !filteredProjects.length ? <EmptyState text="No matching projects in this workspace." /> : null}
        <div className="stack-list">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </Surface>
    );
  }

  return (
    <div className="grid-two">
      <Surface
        eyebrow="Projects"
        title="Project board"
        description="Manager-side parity: create, own and move project routes through a richer workflow without leaving the rollout shell."
        actions={
          <div className="surface-actions cluster">
            <label className="inline-search">
              <span>Filter</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project, location or client" />
            </label>
            <button type="button" className="button-secondary" onClick={startNewProject}>
              New project
            </button>
          </div>
        }
      >
        {projects.loading ? <p className="muted">Loading projects...</p> : null}
        {projects.error ? <p className="error">{projects.error}</p> : null}
        {!projects.loading && !projects.error && !filteredProjects.length ? <EmptyState text="No matching projects in this workspace." /> : null}
        <div className="stack-list">
          {filteredProjects.map((project) => (
            <SelectableCard key={project.id} selected={!isCreatingNew && project.id === selectedProjectId} onSelect={() => selectProject(project)}>
              <ProjectCard project={project} />
            </SelectableCard>
          ))}
        </div>
      </Surface>

      <Surface
        eyebrow={selectedProjectId ? 'Edit project' : 'Create project'}
        title={selectedProjectId ? form.title || 'Edit project' : 'New project'}
        description="These fields now run through reusable `api/v2` contracts, ready to stay portable for a future native client."
      >
        {clients.loading || staff.loading || quotes.loading ? <p className="muted">Loading CRM and quote lookup data...</p> : null}
        {selectedProject ? <ProjectCard project={selectedProject} /> : null}
        <form className="editor-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              Title
              <input value={form.title} onChange={onFieldChange('title')} placeholder="Project title" required />
            </label>
            <label>
              Status
              <select value={form.status} onChange={onFieldChange('status')}>
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Project stage
              <select value={form.projectStage} onChange={onFieldChange('projectStage')}>
                {PROJECT_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {titleCase(stage)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Client
              <select value={form.clientId} onChange={onFieldChange('clientId')}>
                <option value="">Unassigned</option>
                {clients.data.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name || client.email || 'Client'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Project owner
              <select value={form.assignedManagerId} onChange={onFieldChange('assignedManagerId')} disabled={!canReassignProjectOwner}>
                <option value="">Unassigned</option>
                {staff.data.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email || 'Staff'} ({titleCase(member.role || 'employee')})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quote link
              <select value={form.quoteId} onChange={onFieldChange('quoteId')}>
                <option value="">No quote link</option>
                {quotes.data.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    {(quote.projectType || 'Quote') + (quote.location ? ` - ${quote.location}` : '')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Accepted estimate
              <input value={form.acceptedEstimateId} onChange={onFieldChange('acceptedEstimateId')} placeholder="Auto-seeded from quote when available" />
            </label>
            <label>
              Location
              <input value={form.location} onChange={onFieldChange('location')} placeholder="Manchester" />
            </label>
            <label>
              Budget estimate
              <input value={form.budgetEstimate} onChange={onFieldChange('budgetEstimate')} placeholder="32000" />
            </label>
            <label>
              Gallery order
              <input value={form.galleryOrder} onChange={onFieldChange('galleryOrder')} type="number" min="0" />
            </label>
            <label>
              Start date
              <input value={form.startDate} onChange={onFieldChange('startDate')} type="date" />
            </label>
            <label>
              End date
              <input value={form.endDate} onChange={onFieldChange('endDate')} type="date" />
            </label>
            <label>
              Due date
              <input value={form.dueDate} onChange={onFieldChange('dueDate')} type="date" />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Current milestone
              <input value={form.currentMilestone} onChange={onFieldChange('currentMilestone')} placeholder="Site survey complete" />
            </label>
            <label>
              Work package
              <input value={form.workPackage} onChange={onFieldChange('workPackage')} placeholder="Bathroom strip-out and waterproofing" />
            </label>
          </div>

          <label>
            Description
            <textarea value={form.description} onChange={onFieldChange('description')} rows={5} placeholder="Project summary, scope or delivery note." />
          </label>

          <div className="checkbox-row">
            <label>
              <input checked={form.showInGallery} onChange={onFieldChange('showInGallery')} type="checkbox" />
              Show in gallery
            </label>
            <label>
              <input checked={form.isActive} onChange={onFieldChange('isActive')} type="checkbox" />
              Active project
            </label>
          </div>

          <div className="action-row">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : selectedProjectId ? 'Save project' : 'Create project'}
            </button>
            {!isCreatingNew ? (
              <button type="button" className="button-secondary" onClick={startNewProject}>
                Duplicate into new draft
              </button>
            ) : null}
          </div>
          {selectedProjectId ? (
            <div className="action-row action-row--wrap">
              <button type="button" className="button-secondary" onClick={setProjectLifecycleStatus('planning')} disabled={saving}>
                Mark planning
              </button>
              <button type="button" className="button-secondary" onClick={setProjectLifecycleStatus('in_progress')} disabled={saving}>
                Start work
              </button>
              <button type="button" className="button-secondary" onClick={setProjectLifecycleStatus('on_hold')} disabled={saving}>
                Put on hold
              </button>
              <button type="button" className="button-secondary" onClick={setProjectLifecycleStatus('completed')} disabled={saving}>
                Mark completed
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={advanceProjectStage}
                disabled={saving || !selectedProject || normalizeText(selectedProject.projectStage) === FINAL_PROJECT_STAGE}
              >
                Advance stage
              </button>
              <button type="button" className="button-secondary" onClick={selectedProject?.isActive ? archiveProject : restoreProject} disabled={saving}>
                {selectedProject?.isActive ? 'Archive project' : 'Restore project'}
              </button>
              <button type="button" className="button-secondary" onClick={deleteProject} disabled={saving}>
                Delete project
              </button>
            </div>
          ) : null}
          {actionMessage ? <p className="muted">{actionMessage}</p> : null}
          {actionError ? <p className="error">{actionError}</p> : null}
        </form>
        {selectedProjectId ? (
          <div className="stack-list">
            <h3>Project activity</h3>
            {projectActivity.loading ? <p className="muted">Loading project activity...</p> : null}
            {projectActivity.error ? <p className="error">{projectActivity.error}</p> : null}
            {!projectActivity.loading && !projectActivity.error && !projectActivity.data.length ? (
              <EmptyState text="Project activity will appear here after the next saved project action." />
            ) : null}
            {projectActivity.data.map((entry) => (
              <article key={entry.id} className="summary-row">
                <div>
                  <strong>{formatActivityTitle(entry)}</strong>
                  <p>{formatActivityMessage(entry)}</p>
                </div>
                <div className="summary-row-meta">
                  <StatusPill tone={getActivityTone(entry)}>{titleCase(entry.entityType || 'activity')}</StatusPill>
                  <span>{formatActivityMeta(entry)}</span>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </Surface>
    </div>
  );
}

export { ProjectsPage };
