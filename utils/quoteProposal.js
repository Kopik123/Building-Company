const {
  quoteProposalSchema,
  normalizeQuoteProposalDetails
} = require('../shared/contracts/v2');

const humanizeToken = (value) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

const getRawProposalValue = (value) => {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      const parseError = new Error('Invalid quote proposal payload.');
      parseError.statusCode = 400;
      parseError.code = 'invalid_quote_proposal';
      parseError.cause = error;
      throw parseError;
    }
  }
  if (typeof value === 'object') return value;
  return null;
};

const parseQuoteProposalDetails = (value, options = {}) => {
  const rawProposal = getRawProposalValue(value);
  if (!rawProposal) return null;

  const normalized = normalizeQuoteProposalDetails({
    source: options.source || 'public_quote_form_v2',
    ...rawProposal
  });
  const parsed = quoteProposalSchema.safeParse(normalized);

  if (parsed.success) {
    return parsed.data;
  }

  const validationError = new Error('Invalid quote proposal payload.');
  validationError.statusCode = 400;
  validationError.code = 'invalid_quote_proposal';
  validationError.details = parsed.error.flatten();
  validationError.cause = parsed.error;
  throw validationError;
};

const normalizeHumanList = (values = []) => {
  const uniqueValues = [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
  return uniqueValues.map((value) => humanizeToken(value));
};

const pushLine = (lines, label, value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return;
  lines.push(`${label}: ${trimmed}`);
};

const buildQuoteDescriptionFromProposal = ({ description = '', proposalDetails = null, location = null, postcode = null, budgetRange = null }) => {
  const lines = [];
  const normalizedDescription = String(description || '').trim();
  const normalizedProposal = proposalDetails ? normalizeQuoteProposalDetails(proposalDetails) : null;

  if (normalizedProposal?.brief?.summary) {
    lines.push(normalizedProposal.brief.summary);
  } else if (normalizedDescription) {
    lines.push(normalizedDescription);
  }

  const rooms = normalizeHumanList(normalizedProposal?.projectScope?.roomsInvolved);
  const priorities = normalizeHumanList(normalizedProposal?.priorities);

  pushLine(lines, 'Property type', humanizeToken(normalizedProposal?.projectScope?.propertyType));
  pushLine(lines, 'Rooms involved', rooms.join(', '));
  pushLine(lines, 'Occupancy', humanizeToken(normalizedProposal?.projectScope?.occupancyStatus));
  pushLine(lines, 'Planning stage', humanizeToken(normalizedProposal?.projectScope?.planningStage));
  pushLine(lines, 'Target start', humanizeToken(normalizedProposal?.projectScope?.targetStartWindow));
  pushLine(lines, 'Finish level', humanizeToken(normalizedProposal?.commercial?.finishLevel));
  pushLine(lines, 'Budget', normalizedProposal?.commercial?.budgetRange || budgetRange || null);
  pushLine(lines, 'Location', normalizedProposal?.logistics?.location || location || null);
  pushLine(lines, 'Postcode', normalizedProposal?.logistics?.postcode || postcode || null);
  pushLine(lines, 'Site access', humanizeToken(normalizedProposal?.projectScope?.siteAccess));
  pushLine(lines, 'Priorities', priorities.join(', '));
  pushLine(lines, 'Must haves', normalizedProposal?.brief?.mustHaves);
  pushLine(lines, 'Known constraints', normalizedProposal?.brief?.constraints);

  const uniqueLines = [...new Set(lines.map((line) => line.trim()).filter(Boolean))];
  return uniqueLines.join('\n');
};

module.exports = {
  parseQuoteProposalDetails,
  buildQuoteDescriptionFromProposal,
  humanizeToken
};
