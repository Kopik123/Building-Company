const loadAccessibleQuoteReviewRecord = async ({
  id,
  user,
  loadLegacyQuote,
  loadStagedQuote,
  canAccessLegacyQuote,
  canAccessStagedQuote
}) => {
  const legacyRecord = typeof loadLegacyQuote === 'function' ? await loadLegacyQuote(id) : null;
  if (legacyRecord) {
    if (typeof canAccessLegacyQuote === 'function' && !canAccessLegacyQuote(legacyRecord, user)) {
      return null;
    }
    return {
      kind: 'legacy',
      record: legacyRecord,
      isLegacy: true,
      isStaged: false
    };
  }

  const stagedRecord = typeof loadStagedQuote === 'function' ? await loadStagedQuote(id) : null;
  if (!stagedRecord) return null;
  if (typeof canAccessStagedQuote === 'function' && !canAccessStagedQuote(stagedRecord, user)) {
    return null;
  }

  return {
    kind: 'staged',
    record: stagedRecord,
    isLegacy: false,
    isStaged: true
  };
};

module.exports = {
  loadAccessibleQuoteReviewRecord
};
