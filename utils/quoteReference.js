const { Op } = require('sequelize');

const toPlainQuote = (value) => (value && typeof value === 'object' ? value : {});
const toCompactUpper = (value, maxLength = 12) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, maxLength);
const toPhoneDigits = (value) => String(value || '').replace(/\D+/g, '');
const toEmailLocal = (value) => String(value || '').trim().split('@')[0] || '';

const buildQuoteReferenceBase = (quote) => {
  const plain = toPlainQuote(quote);
  const areaFragment =
    toCompactUpper(plain.postcode || plain.proposalDetails?.logistics?.postcode, 7)
    || toCompactUpper(plain.location, 6)
    || toCompactUpper(plain.projectType, 6)
    || 'QUOTE';
  const phoneDigits = toPhoneDigits(plain.guestPhone || plain.contactPhone || '');
  const contactFragment =
    (phoneDigits ? phoneDigits.slice(-4) : '')
    || toCompactUpper(toEmailLocal(plain.guestEmail || plain.contactEmail || ''), 4)
    || toCompactUpper(plain.id, 4)
    || 'REF';
  return `LL-${areaFragment}-${contactFragment}`;
};

const buildDuplicateWhere = (quote) => {
  const plain = toPlainQuote(quote);
  const where = {};
  const postcode = String(plain.postcode || '').trim();
  const guestPhone = String(plain.guestPhone || '').trim();
  const contactPhone = String(plain.contactPhone || '').trim();
  const guestEmail = String(plain.guestEmail || '').trim().toLowerCase();
  const contactEmail = String(plain.contactEmail || '').trim().toLowerCase();

  if (postcode) where.postcode = postcode;
  if (guestPhone) {
    where.guestPhone = guestPhone;
  } else if (contactPhone) {
    where.contactPhone = contactPhone;
  } else if (guestEmail) {
    where.guestEmail = guestEmail;
  } else if (contactEmail) {
    where.contactEmail = contactEmail;
  } else {
    return null;
  }

  if (plain.createdAt) {
    where.createdAt = { [Op.lte]: plain.createdAt };
  }

  return where;
};

const resolveQuoteReferenceSequence = async (QuoteModel, quote) => {
  if (!QuoteModel || typeof QuoteModel.count !== 'function') return 1;
  const where = buildDuplicateWhere(quote);
  if (!where) return 1;

  try {
    const count = await QuoteModel.count({ where });
    return Number.isFinite(count) && count > 0 ? count : 1;
  } catch (_error) {
    return 1;
  }
};

const resolveQuoteReferenceCode = async (QuoteModel, quote) => {
  const base = buildQuoteReferenceBase(quote);
  const sequence = await resolveQuoteReferenceSequence(QuoteModel, quote);
  return sequence > 1 ? `${base}-${sequence}` : base;
};

module.exports = {
  buildQuoteReferenceBase,
  resolveQuoteReferenceCode
};
