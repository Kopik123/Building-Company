import {
  Surface,
  EmptyState,
  EstimateCard,
  titleCase,
  ESTIMATE_DECISION_STATUSES,
  formatMoney
} from '../../kit.jsx';

function QuoteEstimatesSurface({ quoteEstimatesPanel }) {
  const {
    selectedQuote,
    isCreatingQuote,
    canManageQuotes,
    detailState,
    currentEstimate,
    estimateForm,
    setEstimateForm,
    onCreateEstimate,
    onSendEstimate,
    onConvertToProject,
    isSecondaryBusy,
    isBusyAction,
    canRespondToEstimates,
    responseNote,
    setResponseNote,
    clientEstimateNeedsDecision,
    onRespondToEstimate,
    quoteWorkflowStatuses
  } = quoteEstimatesPanel;

  if (!selectedQuote || isCreatingQuote) return null;

  return (
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
              canManageQuotes && String(estimate.status || '').toLowerCase() === 'draft' && estimate.isCurrentVersion ? (
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
              <select value={selectedQuote.workflowStatus || quoteWorkflowStatuses[0]} disabled>
                {quoteWorkflowStatuses.map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Estimate scope summary
            <textarea value={estimateForm.description} onChange={(event) => setEstimateForm((prev) => ({ ...prev, description: event.target.value }))} rows={4} placeholder="Headline scope and commercial framing for this estimate." />
          </label>
          <label>
            Internal notes
            <textarea value={estimateForm.notes} onChange={(event) => setEstimateForm((prev) => ({ ...prev, notes: event.target.value }))} rows={3} placeholder="Internal notes for the sales and delivery team." />
          </label>
          <div className="action-row">
            <button type="submit" disabled={isSecondaryBusy}>
              {isBusyAction('estimate-draft') ? 'Saving...' : currentEstimate ? 'Draft new version' : 'Draft estimate'}
            </button>
            {selectedQuote?.canConvertToProject ? (
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
            <textarea value={responseNote} onChange={(event) => setResponseNote(event.target.value)} rows={3} placeholder="Questions, revision requests or approval note." />
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
  );
}

export { QuoteEstimatesSurface };
