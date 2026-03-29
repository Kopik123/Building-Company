import { QuoteCard, titleCase } from '../../kit.jsx';

function QuoteDetailReadonlySummary({ quoteDetailPanel }) {
  const { selectedQuote, currentEstimate } = quoteDetailPanel;

  return (
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
  );
}

export { QuoteDetailReadonlySummary };
