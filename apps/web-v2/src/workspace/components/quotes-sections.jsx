import { QuoteBoardSurface } from './quotes/quote-board-surface.jsx';
import { QuoteDetailSurface } from './quotes/quote-detail-surface.jsx';
import { QuoteAttachmentsSurface } from './quotes/quote-attachments-surface.jsx';
import { QuoteEstimatesSurface } from './quotes/quote-estimates-surface.jsx';
import { QuoteTimelineSurface } from './quotes/quote-timeline-surface.jsx';

function QuoteWorkspacePanels({ quoteBoardPanel, quoteDetailPanel, quoteAttachmentsPanel, quoteEstimatesPanel, quoteTimelinePanel }) {
  return (
    <div className="grid-two">
      <QuoteBoardSurface quoteBoardPanel={quoteBoardPanel} />
      <div className="page-stack">
        <QuoteDetailSurface quoteDetailPanel={quoteDetailPanel} />
        <QuoteAttachmentsSurface quoteAttachmentsPanel={quoteAttachmentsPanel} />
        <QuoteEstimatesSurface quoteEstimatesPanel={quoteEstimatesPanel} />
        <QuoteTimelineSurface quoteTimelinePanel={quoteTimelinePanel} />
      </div>
    </div>
  );
}

export { QuoteWorkspacePanels };
