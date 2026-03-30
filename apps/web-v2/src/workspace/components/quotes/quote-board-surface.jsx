import { Surface, EmptyState, SelectableCard, QuoteCard } from '../../kit.jsx';

function QuoteBoardSurface({ quoteBoardPanel }) {
  const {
    canCreateQuotes,
    search,
    setSearch,
    startNewQuote,
    quotes,
    filteredQuotes,
    isCreatingQuote,
    selectedQuoteId,
    selectQuote
  } = quoteBoardPanel;

  return (
    <Surface
      eyebrow="Quotes"
      title="Quote board"
      description="Lead intake, ownership, offers and project conversion now live in the rollout shell."
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
          <SelectableCard
            key={quote.id}
            selected={!isCreatingQuote && quote.id === selectedQuoteId}
            onSelect={() => selectQuote(quote)}
          >
            <QuoteCard quote={quote} />
          </SelectableCard>
        ))}
      </div>
    </Surface>
  );
}

export { QuoteBoardSurface };
