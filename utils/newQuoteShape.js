const { cleanupUploadedFiles, sortQuoteAttachments, toQuoteAttachmentSummary } = require('./quoteAttachments');
const { buildQuoteProjectTitle } = require('./quoteWorkflow');

const toPlain = (value) => (value && typeof value.toJSON === 'function' ? value.toJSON() : { ...(value || {}) });

const normalizeStoredAttachments = (attachments) => {
  const normalized = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
  return sortQuoteAttachments(normalized).map((attachment) => ({
    ...attachment,
    name: attachment.name || attachment.filename || null,
    filename: attachment.filename || attachment.name || null,
    url: attachment.url || null,
    storagePath: attachment.storagePath || null,
    mimeType: attachment.mimeType || attachment.mimetype || null,
    sizeBytes: Number.isFinite(Number(attachment.sizeBytes))
      ? Number(attachment.sizeBytes)
      : (Number.isFinite(Number(attachment.size)) ? Number(attachment.size) : null),
    createdAt: attachment.createdAt || null,
    updatedAt: attachment.updatedAt || null,
    mediaType: attachment.mediaType || 'image'
  }));
};

const createNewQuoteAttachmentEntries = (files) => {
  const createdAt = new Date().toISOString();
  return (Array.isArray(files) ? files : []).filter(Boolean).map((file) => ({
    name: file.originalname || file.name || null,
    filename: file.originalname || file.name || null,
    url: `/uploads/${file.filename}`,
    storagePath: file.path || null,
    mimeType: file.mimetype || file.type || null,
    sizeBytes: Number.isFinite(Number(file.size)) ? Number(file.size) : null,
    mediaType: String(file?.mimetype || file?.type || '').toLowerCase().startsWith('image/') ? 'image' : 'document',
    createdAt,
    updatedAt: createdAt
  }));
};

const appendNewQuoteAttachmentEntries = (existingAttachments, files) => normalizeStoredAttachments([
  ...normalizeStoredAttachments(existingAttachments),
  ...createNewQuoteAttachmentEntries(files)
]);

const toNewQuoteSummary = (newQuote) => {
  const plain = toPlain(newQuote);
  const attachments = normalizeStoredAttachments(plain.attachments);
  const clientRecord = plain.client || null;
  const clientName = plain.clientName || clientRecord?.name || null;
  const clientEmail = plain.clientEmail || clientRecord?.email || null;
  const clientPhone = plain.clientPhone || clientRecord?.phone || null;

  return {
    id: plain.id,
    recordType: 'new_quote',
    quoteRef: plain.quoteRef || plain.quote_ref || '',
    referenceCode: plain.quoteRef || plain.quote_ref || '',
    clientId: plain.clientId || null,
    client: clientRecord
      ? {
        id: clientRecord.id,
        name: clientRecord.name || clientName,
        email: clientRecord.email || clientEmail,
        phone: clientRecord.phone || clientPhone,
        companyName: clientRecord.companyName || null
      }
      : (plain.clientId ? {
        id: plain.clientId,
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        companyName: null
      } : null),
    guestName: clientName,
    guestEmail: clientEmail,
    guestPhone: clientPhone,
    projectType: plain.projectType || '',
    location: plain.location || '',
    postcode: plain.postcode || '',
    budgetRange: plain.budgetRange || '',
    proposalDetails: plain.proposalDetails || null,
    description: plain.description || '',
    sourceChannel: plain.sourceChannel || 'client_quote_portal',
    status: 'pending',
    workflowStatus: 'submitted',
    priority: 'medium',
    assignedManagerId: null,
    currentEstimateId: null,
    convertedProjectId: null,
    canClaim: false,
    claimChannels: [],
    maskedGuestEmail: '',
    maskedGuestPhone: '',
    attachmentCount: attachments.length,
    attachments: attachments.map(toQuoteAttachmentSummary),
    submittedAt: plain.createdAt || plain.submittedAt || null,
    createdAt: plain.createdAt || null,
    updatedAt: plain.updatedAt || plain.createdAt || null,
    accountLinked: true,
    canConvertToProject: true
  };
};

const toNewQuoteProjectMediaRows = (newQuote, projectId) => {
  const plain = toPlain(newQuote);
  return normalizeStoredAttachments(plain.attachments).map((attachment) => ({
    projectId,
    mediaType: attachment.mediaType || 'image',
    url: attachment.url,
    storagePath: attachment.storagePath,
    filename: attachment.filename || attachment.name || 'quote-reference.jpg',
    mimeType: attachment.mimeType || null,
    sizeBytes: Number.isFinite(Number(attachment.sizeBytes)) ? Number(attachment.sizeBytes) : null,
    caption: plain.quoteRef || plain.quote_ref || null,
    showInGallery: false,
    galleryOrder: 0,
    isCover: false
  }));
};

const getNewQuoteStoredAttachmentFiles = (newQuote) => {
  const plain = toPlain(newQuote);
  return normalizeStoredAttachments(plain.attachments).map((attachment) => ({
    path: attachment.storagePath,
    filename: attachment.filename || attachment.name || ''
  }));
};

const cleanupNewQuoteStoredAttachments = async (newQuote, options = null) => {
  const files = getNewQuoteStoredAttachmentFiles(newQuote);
  return cleanupUploadedFiles(files, options || undefined);
};

const buildNewQuoteProjectTitle = (newQuote) => buildQuoteProjectTitle(toPlain(newQuote), null);

module.exports = {
  normalizeStoredAttachments,
  createNewQuoteAttachmentEntries,
  appendNewQuoteAttachmentEntries,
  toNewQuoteSummary,
  toNewQuoteProjectMediaRows,
  getNewQuoteStoredAttachmentFiles,
  cleanupNewQuoteStoredAttachments,
  buildNewQuoteProjectTitle
};
