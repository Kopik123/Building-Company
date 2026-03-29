import { Surface, EmptyState, titleCase } from '../../kit.jsx';
import { QuoteDetailEditorForm } from './quote-detail-editor-form.jsx';
import { QuoteDetailReadonlySummary } from './quote-detail-readonly-summary.jsx';

function QuoteDetailSurface({ quoteDetailPanel }) {
  const { canManageQuotes, isCreatingQuote, selectedQuote, detailState, actionMessage, actionError } = quoteDetailPanel;

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
      {(isCreatingQuote || canManageQuotes) && (selectedQuote || isCreatingQuote) ? <QuoteDetailEditorForm quoteDetailPanel={quoteDetailPanel} /> : null}
      {selectedQuote && !isCreatingQuote && !canManageQuotes ? <QuoteDetailReadonlySummary quoteDetailPanel={quoteDetailPanel} /> : null}
      {actionMessage ? <p className="muted">{actionMessage}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}
    </Surface>
  );
}

export { QuoteDetailSurface };
