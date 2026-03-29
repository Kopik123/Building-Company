import { Surface, EmptyState, QuoteEventRow } from '../../kit.jsx';

function QuoteTimelineSurface({ quoteTimelinePanel }) {
  const { selectedQuote, isCreatingQuote, detailState } = quoteTimelinePanel;

  if (!selectedQuote || isCreatingQuote) return null;

  return (
    <Surface eyebrow="Timeline" title="Quote activity" description="Every intake, assignment, offer and conversion event for the current quote.">
      {!detailState.events.length ? <EmptyState text="No quote events have been recorded yet." /> : null}
      <div className="stack-list">
        {detailState.events.map((event) => (
          <QuoteEventRow key={event.id} event={event} />
        ))}
      </div>
    </Surface>
  );
}

export { QuoteTimelineSurface };
