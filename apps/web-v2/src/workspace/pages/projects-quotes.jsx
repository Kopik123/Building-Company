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

function QuotesPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'client');
  const canManageQuotes = ['manager', 'admin'].includes(role);
  const canCreateQuotes = canManageQuotes || role === 'client';
  const canRespondToEstimates = role === 'client';
  const quotes = useAsyncState(() => v2Api.getQuotes(), [], []);
  const clients = useAsyncState(() => (canManageQuotes ? v2Api.getCrmClients() : Promise.resolve([])), [canManageQuotes], []);
  const staff = useAsyncState(() => (canManageQuotes ? v2Api.getCrmStaff() : Promise.resolve([])), [canManageQuotes], []);
  const [search, setSearch] = React.useState('');
  const [selectedQuoteId, setSelectedQuoteId] = React.useState('');
  const [isCreatingQuote, setIsCreatingQuote] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [secondaryAction, setSecondaryAction] = React.useState('');
  const isSecondaryBusy = Boolean(secondaryAction);
  const isBusyAction = (action) => secondaryAction === action;
  const [actionError, setActionError] = React.useState('');
  const [actionMessage, setActionMessage] = React.useState('');
  const [form, setForm] = React.useState(() => createQuoteFormState());
  const [quoteFiles, setQuoteFiles] = React.useState([]);
  const [followUpQuoteFiles, setFollowUpQuoteFiles] = React.useState([]);
  const [followUpUploadInputKey, setFollowUpUploadInputKey] = React.useState(0);
  const [estimateForm, setEstimateForm] = React.useState(() => createEstimateFormState());
  const [responseNote, setResponseNote] = React.useState('');
  const [detailState, setDetailState] = React.useState({
    loading: false,
    error: '',
    quote: null,
    estimates: [],
    events: []
  });
  const deferredSearch = React.useDeferredValue(search);
  const managerOptions = staff.data.filter((member) => ['manager', 'admin'].includes(normalizeText(member?.role)));

  const filteredQuotes = sortByRecent(quotes.data, ['updatedAt', 'createdAt']).filter((quote) => {
    const needle = normalizeText(deferredSearch);
    if (!needle) return true;
    return [
      quote?.projectType,
      quote?.location,
      quote?.workflowStatus,
      quote?.status,
      quote?.priority,
      quote?.guestName,
      quote?.guestEmail,
      quote?.guestPhone,
      quote?.client?.email,
      quote?.budgetRange
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  const upsertQuote = (nextQuote) => {
    if (!nextQuote?.id) return;
    quotes.setData((prev) =>
      sortByRecent(
        [nextQuote, ...(Array.isArray(prev) ? prev.filter((quote) => quote.id !== nextQuote.id) : [])],
        ['updatedAt', 'createdAt']
      )
    );
  };

  const onQuoteFilesChange = (event) => {
    const { files, error } = validateQuotePhotoSelection({
      currentFiles: quoteFiles,
      incomingFiles: Array.from(event.target.files || [])
    });
    event.target.value = '';
    setActionError(error);
    setQuoteFiles(files);
  };

  const onFollowUpQuoteFilesChange = (event) => {
    const { files, error } = validateQuotePhotoSelection({
      currentFiles: followUpQuoteFiles,
      incomingFiles: Array.from(event.target.files || []),
      existingAttachmentCount: Number(selectedQuote?.attachmentCount || 0)
    });
    event.target.value = '';
    setActionError(error);
    setFollowUpQuoteFiles(files);
  };

  const loadQuoteWorkspace = async (quoteId = selectedQuoteId) => {
    if (!quoteId) {
      setDetailState({ loading: false, error: '', quote: null, estimates: [], events: [] });
      return null;
    }

    setDetailState((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      const [initialQuote, events, estimates] = await Promise.all([
        v2Api.getQuote(quoteId),
        v2Api.getQuoteTimeline(quoteId),
        v2Api.getQuoteEstimates(quoteId)
      ]);
      const refreshedQuote = await v2Api.getQuote(quoteId).catch(() => initialQuote);

      upsertQuote(refreshedQuote);
      setDetailState({
        loading: false,
        error: '',
        quote: refreshedQuote,
        estimates,
        events
      });
      return {
        quote: refreshedQuote,
        estimates,
        events
      };
    } catch (error) {
      setDetailState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Could not load quote workspace'
      }));
      return null;
    }
  };

  React.useEffect(() => {
    if (isCreatingQuote) return;
    if (!filteredQuotes.length) {
      if (selectedQuoteId) setSelectedQuoteId('');
      return;
    }
    if (!filteredQuotes.some((quote) => quote.id === selectedQuoteId)) {
      setSelectedQuoteId(filteredQuotes[0].id);
    }
  }, [filteredQuotes, selectedQuoteId, isCreatingQuote]);

  React.useEffect(() => {
    if (!canManageQuotes) return;
    if (isCreatingQuote) return;
    const selectedQuote = quotes.data.find((quote) => quote.id === selectedQuoteId);
    if (!selectedQuote) return;
    setForm(quoteToFormState(selectedQuote));
  }, [selectedQuoteId, quotes.data, canManageQuotes, isCreatingQuote]);

  React.useEffect(() => {
    if (isCreatingQuote || !selectedQuoteId) {
      if (isCreatingQuote) {
        setDetailState({ loading: false, error: '', quote: null, estimates: [], events: [] });
      }
      return;
    }
    loadQuoteWorkspace(selectedQuoteId);
  }, [selectedQuoteId, isCreatingQuote]);

  const selectedQuote = detailState.quote || quotes.data.find((quote) => quote.id === selectedQuoteId) || null;
  const remainingQuotePhotoSlots = getRemainingQuotePhotoSlots(selectedQuote);
  const currentEstimate =
    detailState.estimates.find((estimate) => estimate?.isCurrentVersion)
    || detailState.estimates[0]
    || selectedQuote?.latestEstimate
    || null;
  const clientEstimateNeedsDecision =
    canRespondToEstimates
    && currentEstimate
    && normalizeText(currentEstimate.status) === 'sent'
    && ['pending', 'viewed', 'revision_requested'].includes(normalizeText(currentEstimate.decisionStatus));

  React.useEffect(() => {
    if (!selectedQuote || isCreatingQuote) {
      setEstimateForm(createEstimateFormState());
      setResponseNote('');
      return;
    }

    setEstimateForm((prev) => createEstimateFormState({
      title: prev.title || `${titleCase(selectedQuote.projectType || 'Quote')} Offer`,
      total: prev.total,
      description: prev.description || selectedQuote.description || '',
      notes: prev.notes,
      clientMessage: prev.clientMessage
    }));
  }, [selectedQuote, isCreatingQuote]);

  const startNewQuote = () => {
    setIsCreatingQuote(true);
    setSelectedQuoteId('');
    setForm(
      createQuoteFormState({
        assignedManagerId: managerOptions[0]?.id || user?.id || '',
        contactPhone: user?.phone || ''
      })
    );
    setEstimateForm(createEstimateFormState());
    setQuoteFiles([]);
    setFollowUpQuoteFiles([]);
    setFollowUpUploadInputKey((value) => value + 1);
    setResponseNote('');
    setDetailState({ loading: false, error: '', quote: null, estimates: [], events: [] });
    setActionError('');
    setActionMessage('');
  };

  const selectQuote = (quote) => {
    setIsCreatingQuote(false);
    setSelectedQuoteId(quote.id);
    setQuoteFiles([]);
    setFollowUpQuoteFiles([]);
    setFollowUpUploadInputKey((value) => value + 1);
    if (canManageQuotes) setForm(quoteToFormState(quote));
    setActionError('');
    setActionMessage('');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if ((!selectedQuoteId && !isCreatingQuote) || saving) return;
    if (quoteFiles.length > MAX_QUOTE_PHOTO_FILES) {
      setActionError(`Attach up to ${MAX_QUOTE_PHOTO_FILES} photos per quote.`);
      return;
    }

    setSaving(true);
    setActionError('');
    setActionMessage('');

    try {
      const selectedQuoteFiles = [...quoteFiles];
      const payload = {
        projectType: form.projectType,
        location: String(form.location || '').trim(),
        description: String(form.description || '').trim(),
        priority: form.priority,
        contactMethod: form.contactMethod || null,
        postcode: toNullablePayload(form.postcode),
        budgetRange: toNullablePayload(form.budgetRange),
        contactPhone: toNullablePayload(form.contactPhone)
      };
      if (canManageQuotes) {
        Object.assign(payload, {
          status: form.status,
          clientId: form.clientId || null,
          assignedManagerId: form.assignedManagerId || null,
          guestName: toNullablePayload(form.guestName),
          guestEmail: toNullablePayload(form.guestEmail),
          guestPhone: toNullablePayload(form.guestPhone),
          contactEmail: toNullablePayload(form.contactEmail)
        });
      }
      let savedQuote = selectedQuoteId ? await v2Api.updateQuote(selectedQuoteId, payload) : await v2Api.createQuote(payload);
      if (!savedQuote?.id) throw new Error('Quote response missing payload');

      let uploadedPhotoCount = 0;
      if (selectedQuoteFiles.length) {
        try {
          const attachmentResult = await v2Api.uploadQuoteAttachments(savedQuote.id, { files: selectedQuoteFiles });
          if (attachmentResult?.quote?.id) {
            savedQuote = attachmentResult.quote;
          }
          uploadedPhotoCount = selectedQuoteFiles.length;
          setQuoteFiles([]);
        } catch (uploadError) {
          setActionError(`Quote saved, but photo upload failed: ${uploadError.message || 'Try again.'}`);
        }
      }

      upsertQuote(savedQuote);
      setIsCreatingQuote(false);
      setSelectedQuoteId(savedQuote.id);
      if (canManageQuotes) setForm(quoteToFormState(savedQuote));
      await loadQuoteWorkspace(savedQuote.id);
      setActionMessage(
        uploadedPhotoCount
          ? selectedQuoteId
            ? `Quote saved and ${uploadedPhotoCount} photo(s) uploaded.`
            : `Quote created with ${uploadedPhotoCount} photo(s).`
          : selectedQuoteId
            ? 'Quote saved.'
            : 'Quote created.'
      );
    } catch (error) {
      setActionError(error.message || 'Could not save quote');
    } finally {
      setSaving(false);
    }
  };

  const onTakeOwnership = async () => {
    if (!selectedQuote?.id || isSecondaryBusy) return;
    setSecondaryAction('take-ownership');
    setActionError('');
    setActionMessage('');
    try {
      const result = await v2Api.assignQuote(selectedQuote.id, {});
      upsertQuote(result.quote);
      await loadQuoteWorkspace(selectedQuote.id);
      setActionMessage('Quote ownership updated.');
    } catch (error) {
      setActionError(error.message || 'Could not take ownership of this quote');
    } finally {
      setSecondaryAction('');
    }
  };

  const onCreateEstimate = async (event) => {
    event.preventDefault();
    if (!selectedQuote?.id || isSecondaryBusy) return;

    setSecondaryAction('estimate-draft');
    setActionError('');
    setActionMessage('');
    try {
      await v2Api.createQuoteEstimate(selectedQuote.id, {
        title: String(estimateForm.title || '').trim(),
        total: toNullablePayload(estimateForm.total),
        description: toNullablePayload(estimateForm.description),
        notes: toNullablePayload(estimateForm.notes)
      });
      await loadQuoteWorkspace(selectedQuote.id);
      setEstimateForm((prev) => createEstimateFormState({
        title: prev.title,
        description: prev.description || selectedQuote.description || ''
      }));
      setActionMessage('Estimate drafted.');
    } catch (error) {
      setActionError(error.message || 'Could not draft estimate');
    } finally {
      setSecondaryAction('');
    }
  };

  const onSendEstimate = async (estimateId) => {
    if (!selectedQuote?.id || !estimateId || isSecondaryBusy) return;

    setSecondaryAction('estimate-send');
    setActionError('');
    setActionMessage('');
    try {
      const result = await v2Api.sendQuoteEstimate(estimateId, {
        clientMessage: toNullablePayload(estimateForm.clientMessage)
      });
      upsertQuote(result.quote);
      await loadQuoteWorkspace(selectedQuote.id);
      setActionMessage('Estimate sent to client.');
    } catch (error) {
      setActionError(error.message || 'Could not send estimate');
    } finally {
      setSecondaryAction('');
    }
  };

  const onRespondToEstimate = async (decision) => {
    if (!currentEstimate?.id || isSecondaryBusy) return;

    setSecondaryAction('estimate-response');
    setActionError('');
    setActionMessage('');
    try {
      const result = await v2Api.respondToEstimate(currentEstimate.id, {
        decision,
        note: toNullablePayload(responseNote)
      });
      upsertQuote(result.quote);
      await loadQuoteWorkspace(selectedQuote.id);
      setResponseNote('');
      setActionMessage(`Estimate ${decision.replaceAll('_', ' ')}.`);
    } catch (error) {
      setActionError(error.message || 'Could not send estimate response');
    } finally {
      setSecondaryAction('');
    }
  };

  const onConvertToProject = async () => {
    if (!selectedQuote?.id || isSecondaryBusy) return;

    setSecondaryAction('quote-convert');
    setActionError('');
    setActionMessage('');
    try {
      const result = await v2Api.convertQuoteToProject(selectedQuote.id);
      upsertQuote(result.quote);
      await loadQuoteWorkspace(selectedQuote.id);
      setActionMessage(`Project created: ${result.project?.title || result.project?.id}.`);
    } catch (error) {
      setActionError(error.message || 'Could not convert quote into project');
    } finally {
      setSecondaryAction('');
    }
  };

  const onUploadFollowUpPhotos = async () => {
    if (!selectedQuote?.id || !followUpQuoteFiles.length || isSecondaryBusy) return;
    if (remainingQuotePhotoSlots <= 0) {
      setActionError(`This quote already has the maximum ${MAX_QUOTE_PHOTO_FILES} photos.`);
      return;
    }
    if (followUpQuoteFiles.length > remainingQuotePhotoSlots) {
      setActionError(`This quote can store up to ${MAX_QUOTE_PHOTO_FILES} photos. You can add ${remainingQuotePhotoSlots} more right now.`);
      return;
    }

    setSecondaryAction('follow-up-upload');
    setActionError('');
    setActionMessage('');
    try {
      const attachmentResult = await v2Api.uploadQuoteAttachments(selectedQuote.id, { files: followUpQuoteFiles });
      if (attachmentResult?.quote?.id) {
        upsertQuote(attachmentResult.quote);
      }
      await loadQuoteWorkspace(selectedQuote.id);
      setFollowUpQuoteFiles([]);
      setFollowUpUploadInputKey((value) => value + 1);
      setActionMessage(
        followUpQuoteFiles.length === 1
          ? 'Added 1 more quote photo.'
          : `Added ${followUpQuoteFiles.length} more quote photos.`
      );
    } catch (error) {
      setActionError(error.message || 'Could not upload additional quote photos');
    } finally {
      setSecondaryAction('');
    }
  };

  return (
    <div className="grid-two">
      <Surface
        eyebrow="Quotes"
        title="Quote board"
        description={
          canManageQuotes
            ? 'Lead intake, ownership, offers and project conversion now live in the rollout shell.'
            : canRespondToEstimates
              ? 'Track your requests, review offers and move approved work into project onboarding.'
              : 'Portable quote summaries from `api/v2`, shared between web and the future mobile app.'
        }
        actions={
          <div className="surface-actions cluster">
            <label className="inline-search">
              <span>Filter</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search quote, location or guest" />
            </label>
            {canCreateQuotes ? (
              <button type="button" className="button-secondary" onClick={startNewQuote}>
                New quote
              </button>
            ) : null}
          </div>
        }
      >
        {quotes.loading ? <p className="muted">Loading quotes...</p> : null}
        {quotes.error ? <p className="error">{quotes.error}</p> : null}
        {!quotes.loading && !quotes.error && !filteredQuotes.length ? <EmptyState text="No quote routes are available right now." /> : null}
        <div className="stack-list">
          {filteredQuotes.map((quote) => (
            <SelectableCard key={quote.id} selected={!isCreatingQuote && quote.id === selectedQuoteId} onSelect={() => selectQuote(quote)}>
              <QuoteCard quote={quote} />
            </SelectableCard>
          ))}
        </div>
      </Surface>

      <div className="page-stack">
        <Surface
          eyebrow="Quote detail"
          title={isCreatingQuote ? 'New quote' : selectedQuote?.projectType || 'Select a quote'}
          description={
            isCreatingQuote
              ? canManageQuotes
                ? 'Create an internal, guest or linked client quote directly in `web-v2`.'
                : 'Submit a new quote request from the authenticated client workspace.'
              : selectedQuote
                ? `Stage: ${titleCase(selectedQuote.workflowStatus || selectedQuote.status || 'submitted')}`
                : 'Select a quote to review its timeline, offers and next action.'
          }
        >
          {!selectedQuote && !isCreatingQuote ? <EmptyState text="No quote selected." /> : null}
          {detailState.loading && !isCreatingQuote ? <p className="muted">Loading quote workspace...</p> : null}
          {detailState.error && !isCreatingQuote ? <p className="error">{detailState.error}</p> : null}
          {(isCreatingQuote || canManageQuotes) && (selectedQuote || isCreatingQuote) ? (
            <form className="editor-form" onSubmit={onSubmit}>
              {selectedQuote && !isCreatingQuote ? <QuoteCard quote={selectedQuote} /> : null}
              <div className="form-grid">
                <label>
                  Project type
                  <select value={form.projectType} onChange={(event) => setForm((prev) => ({ ...prev, projectType: event.target.value }))}>
                    {QUOTE_PROJECT_TYPES.map((projectType) => (
                      <option key={projectType} value={projectType}>
                        {titleCase(projectType)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Location
                  <input value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} placeholder="Manchester" required />
                </label>
                {canManageQuotes ? (
                  <>
                    <label>
                      Client
                      <select value={form.clientId} onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}>
                        <option value="">Guest / unlinked quote</option>
                        {clients.data.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name || client.email || client.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Assigned manager
                      <select value={form.assignedManagerId} onChange={(event) => setForm((prev) => ({ ...prev, assignedManagerId: event.target.value }))}>
                        <option value="">Unassigned</option>
                        {managerOptions.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name || member.email || member.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Quote status
                      <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                        {QUOTE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {titleCase(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Quote priority
                      <select value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}>
                        {QUOTE_PRIORITIES.map((priority) => (
                          <option key={priority} value={priority}>
                            {titleCase(priority)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Guest name
                      <input value={form.guestName} onChange={(event) => setForm((prev) => ({ ...prev, guestName: event.target.value }))} placeholder="Guest or lead name" />
                    </label>
                    <label>
                      Guest email
                      <input value={form.guestEmail} onChange={(event) => setForm((prev) => ({ ...prev, guestEmail: event.target.value }))} type="email" placeholder="guest@example.com" />
                    </label>
                    <label>
                      Guest phone
                      <input value={form.guestPhone} onChange={(event) => setForm((prev) => ({ ...prev, guestPhone: event.target.value }))} placeholder="+44 ..." />
                    </label>
                  </>
                ) : null}
                <label>
                  Contact method
                  <select value={form.contactMethod} onChange={(event) => setForm((prev) => ({ ...prev, contactMethod: event.target.value }))}>
                    {QUOTE_CONTACT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {titleCase(method)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Postcode
                  <input value={form.postcode} onChange={(event) => setForm((prev) => ({ ...prev, postcode: event.target.value }))} placeholder="M20 2AB" />
                </label>
                <label>
                  Budget range
                  <input value={form.budgetRange} onChange={(event) => setForm((prev) => ({ ...prev, budgetRange: event.target.value }))} placeholder="40k-60k" />
                </label>
                {canManageQuotes ? (
                  <label>
                    Contact email
                    <input value={form.contactEmail} onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))} type="email" placeholder="contact@example.com" />
                  </label>
                ) : null}
                <label>
                  Contact phone
                  <input value={form.contactPhone} onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))} placeholder="+44 ..." />
                </label>
              </div>
              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Scope, intent and lead context for this quote."
                  rows={5}
                  required
                />
              </label>
              <label className="file-input">
                <span>Reference photos</span>
                <input type="file" accept="image/*" multiple onChange={onQuoteFilesChange} />
              </label>
              {quoteFiles.length ? (
                <div className="attachment-list">
                  {quoteFiles.map((file) => (
                    <span key={`${file.name}-${file.size}`} className="attachment-chip attachment-chip--muted">
                      {file.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted">Optional: attach up to {MAX_QUOTE_PHOTO_FILES} reference photos.</p>
              )}
              {selectedQuote && !isCreatingQuote ? (
                <div className="meta-wrap">
                  <span>Workflow: {titleCase(selectedQuote.workflowStatus || 'submitted')}</span>
                  <span>Client: {selectedQuote.client?.email || 'Guest quote'}</span>
                  <span>Assigned manager: {selectedQuote.assignedManager?.email || 'Unassigned'}</span>
                  <span>Photos: {selectedQuote.attachmentCount || 0}</span>
                  <span>Created: {formatDateTime(selectedQuote.createdAt)}</span>
                </div>
              ) : null}
              {clients.loading || staff.loading ? <p className="muted">Loading linked CRM people...</p> : null}
              <div className="action-row">
                <button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : selectedQuoteId ? 'Save quote' : 'Create quote'}
                </button>
                {canManageQuotes && selectedQuote && !isCreatingQuote ? (
                  <button type="button" className="button-secondary" onClick={onTakeOwnership} disabled={isSecondaryBusy}>
                    {isBusyAction('take-ownership') ? 'Updating...' : 'Take ownership'}
                  </button>
                ) : null}
                {canManageQuotes && selectedQuote?.canConvertToProject ? (
                  <button type="button" className="button-secondary" onClick={onConvertToProject} disabled={isSecondaryBusy}>
                    {isBusyAction('quote-convert') ? 'Converting...' : 'Convert to project'}
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}
          {selectedQuote && !isCreatingQuote && !canManageQuotes ? (
            <div className="stack-list">
              <QuoteCard quote={selectedQuote} />
              <div className="meta-wrap">
                <span>Workflow: {titleCase(selectedQuote.workflowStatus || 'submitted')}</span>
                <span>Source: {titleCase(selectedQuote.sourceChannel || 'portal')}</span>
                <span>Photos: {selectedQuote.attachmentCount || 0}</span>
                <span>Current estimate: {currentEstimate ? `v${currentEstimate.versionNumber || 1}` : 'Not sent yet'}</span>
                <span>Assigned manager: {selectedQuote.assignedManager?.name || selectedQuote.assignedManager?.email || 'Pending assignment'}</span>
              </div>
            </div>
          ) : null}
          {actionMessage ? <p className="muted">{actionMessage}</p> : null}
          {actionError ? <p className="error">{actionError}</p> : null}
        </Surface>

        {selectedQuote && !isCreatingQuote ? (
          <Surface
            eyebrow="Attachments"
            title="Quote photos"
            description={
              canManageQuotes
                ? 'Reference images attached by the client or operations team for this quote.'
                : 'Reference images attached to your quote request.'
            }
          >
            <QuoteAttachmentList attachments={selectedQuote.attachments} />
            {!canManageQuotes ? (
              <div className="editor-form">
                <label className="file-input">
                  <span>Add more reference photos</span>
                  <input key={followUpUploadInputKey} type="file" accept="image/*" multiple onChange={onFollowUpQuoteFilesChange} />
                </label>
                <p className="muted">
                  {remainingQuotePhotoSlots > 0
                    ? `This quote currently stores ${selectedQuote.attachmentCount || 0} of ${MAX_QUOTE_PHOTO_FILES} photos. You can add ${remainingQuotePhotoSlots} more.`
                    : `This quote already stores the maximum ${MAX_QUOTE_PHOTO_FILES} photos.`}
                </p>
                {followUpQuoteFiles.length ? (
                  <div className="attachment-list">
                    {followUpQuoteFiles.map((file) => (
                      <span key={getSelectedFileKey(file)} className="attachment-chip attachment-chip--muted">
                        {file.name}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="action-row">
                  <button type="button" onClick={onUploadFollowUpPhotos} disabled={!followUpQuoteFiles.length || isSecondaryBusy || remainingQuotePhotoSlots <= 0}>
                    {isBusyAction('follow-up-upload') ? 'Uploading...' : 'Upload more photos'}
                  </button>
                </div>
              </div>
            ) : null}
          </Surface>
        ) : null}

        {selectedQuote && !isCreatingQuote ? (
          <Surface
            eyebrow="Estimates"
            title="Offers and approvals"
            description={
              canManageQuotes
                ? 'Draft, send and promote the current offer into a live project once the client accepts.'
                : 'Review the latest commercial offer and send your decision back to the team.'
            }
          >
            {!detailState.estimates.length ? <EmptyState text="No estimates attached to this quote yet." /> : null}
            <div className="stack-list">
              {detailState.estimates.map((estimate) => (
                <EstimateCard
                  key={estimate.id}
                  estimate={estimate}
                  actions={
                    canManageQuotes && normalizeText(estimate.status) === 'draft' && estimate.isCurrentVersion ? (
                      <button type="button" className="button-secondary" onClick={() => onSendEstimate(estimate.id)} disabled={isSecondaryBusy}>
                        Send to client
                      </button>
                    ) : null
                  }
                />
              ))}
            </div>

            {canManageQuotes ? (
              <form className="editor-form" onSubmit={onCreateEstimate}>
                {currentEstimate ? (
                  <p className="muted">
                    Drafting a new estimate version will move {`v${currentEstimate.versionNumber || 1}`} into version history and keep only the new version actionable for the client.
                  </p>
                ) : null}
                <div className="form-grid">
                  <label>
                    Estimate title
                    <input value={estimateForm.title} onChange={(event) => setEstimateForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Bathroom renovation offer" required />
                  </label>
                  <label>
                    Estimate total
                    <input value={estimateForm.total} onChange={(event) => setEstimateForm((prev) => ({ ...prev, total: event.target.value }))} placeholder="12500" type="number" min="0" step="0.01" />
                  </label>
                  <label>
                    Client message
                    <input value={estimateForm.clientMessage} onChange={(event) => setEstimateForm((prev) => ({ ...prev, clientMessage: event.target.value }))} placeholder="What the client should know before review." />
                  </label>
                  <label>
                    Current workflow
                    <select value={selectedQuote.workflowStatus || QUOTE_WORKFLOW_STATUSES[0]} disabled>
                      {QUOTE_WORKFLOW_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {titleCase(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Estimate scope summary
                  <textarea
                    value={estimateForm.description}
                    onChange={(event) => setEstimateForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={4}
                    placeholder="Headline scope and commercial framing for this estimate."
                  />
                </label>
                <label>
                  Internal notes
                  <textarea
                    value={estimateForm.notes}
                    onChange={(event) => setEstimateForm((prev) => ({ ...prev, notes: event.target.value }))}
                    rows={3}
                    placeholder="Internal notes for the sales and delivery team."
                  />
                </label>
                <div className="action-row">
                  <button type="submit" disabled={isSecondaryBusy}>
                    {isBusyAction('estimate-draft') ? 'Saving...' : currentEstimate ? 'Draft new version' : 'Draft estimate'}
                  </button>
                  {selectedQuote.canConvertToProject ? (
                    <button type="button" className="button-secondary" onClick={onConvertToProject} disabled={isSecondaryBusy}>
                      Convert to project
                    </button>
                  ) : null}
                </div>
              </form>
            ) : null}

            {canRespondToEstimates && currentEstimate ? (
              <div className="editor-form">
                <div className="meta-wrap">
                  <span>Current offer: {currentEstimate.title || 'Estimate'}</span>
                  <span>Version: v{currentEstimate.versionNumber || 1}</span>
                  <span>Status: {titleCase(currentEstimate.status || 'draft')}</span>
                  <span>Decision: {titleCase(currentEstimate.decisionStatus || ESTIMATE_DECISION_STATUSES[0])}</span>
                  <span>Total: {formatMoney(currentEstimate.total)}</span>
                </div>
                {currentEstimate.clientMessage ? <p className="muted">Manager note: {currentEstimate.clientMessage}</p> : null}
                {currentEstimate.decisionNote ? <p className="muted">Latest decision note: {currentEstimate.decisionNote}</p> : null}
                <label>
                  Response note
                  <textarea
                    value={responseNote}
                    onChange={(event) => setResponseNote(event.target.value)}
                    rows={3}
                    placeholder="Questions, revision requests or approval note."
                  />
                </label>
                <div className="action-row">
                  <button type="button" onClick={() => onRespondToEstimate('accepted')} disabled={!clientEstimateNeedsDecision || isSecondaryBusy}>
                    Accept estimate
                  </button>
                  <button type="button" className="button-secondary" onClick={() => onRespondToEstimate('revision_requested')} disabled={!clientEstimateNeedsDecision || isSecondaryBusy}>
                    Request revision
                  </button>
                  <button type="button" className="button-secondary" onClick={() => onRespondToEstimate('declined')} disabled={!clientEstimateNeedsDecision || isSecondaryBusy}>
                    Decline estimate
                  </button>
                </div>
              </div>
            ) : null}
          </Surface>
        ) : null}

        {selectedQuote && !isCreatingQuote ? (
          <Surface
            eyebrow="Timeline"
            title="Quote activity"
            description={
              canManageQuotes
                ? 'Every intake, assignment, offer and conversion event for the current quote.'
                : 'A client-visible timeline of what happened next.'
            }
          >
            {!detailState.events.length ? <EmptyState text="No quote events have been recorded yet." /> : null}
            <div className="stack-list">
              {detailState.events.map((event) => (
                <QuoteEventRow key={event.id} event={event} />
              ))}
            </div>
          </Surface>
        ) : null}
      </div>
    </div>
  );
}


export { ProjectsPage, QuotesPage };
