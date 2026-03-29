import { QuoteWorkspacePanels } from '../components/quotes-sections.jsx';
import { useQuoteWorkspaceController } from '../hooks/use-quote-workspace-controller.js';

function QuotesPage() {
  const {
    quoteBoardPanel,
    quoteDetailPanel,
    quoteAttachmentsPanel,
    quoteEstimatesPanel,
    quoteTimelinePanel
  } = useQuoteWorkspaceController();

  return (
    <QuoteWorkspacePanels
      quoteBoardPanel={quoteBoardPanel}
      quoteDetailPanel={quoteDetailPanel}
      quoteAttachmentsPanel={quoteAttachmentsPanel}
      quoteEstimatesPanel={quoteEstimatesPanel}
      quoteTimelinePanel={quoteTimelinePanel}
    />
  );
}

export { QuotesPage };
