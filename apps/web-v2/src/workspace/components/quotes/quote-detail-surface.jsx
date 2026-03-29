import {
  Surface,
  EmptyState,
  QuoteCard,
  titleCase,
  QUOTE_PROJECT_TYPES,
  QUOTE_STATUSES,
  QUOTE_PRIORITIES,
  QUOTE_CONTACT_METHODS,
  MAX_QUOTE_PHOTO_FILES,
  formatDateTime
} from '../../kit.jsx';

function QuoteDetailSurface({ quoteDetailPanel }) {
  const {
    canManageQuotes,
    isCreatingQuote,
    selectedQuote,
    detailState,
    form,
    setForm,
    clients,
    managerOptions,
    onSubmit,
    quoteFiles,
    onQuoteFilesChange,
    saving,
    isSecondaryBusy,
    actionMessage,
    actionError,
    onTakeOwnership,
    onConvertToProject,
    isBusyAction,
    selectedQuoteId,
    currentEstimate
  } = quoteDetailPanel;

  return (
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
            <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Scope, intent and lead context for this quote." rows={5} required />
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
          {clients.loading ? <p className="muted">Loading linked CRM people...</p> : null}
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
  );
}

export { QuoteDetailSurface };
