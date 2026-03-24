const fs = require('node:fs/promises');
const path = require('node:path');
const { UPLOADS_DIR } = require('./upload');

const MAX_QUOTE_ATTACHMENT_FILES = 8;

const normalizeFiles = (files) => (Array.isArray(files) ? files.filter(Boolean) : []);
const isImageUpload = (file) => String(file?.mimetype || '').toLowerCase().startsWith('image/');

const validateQuoteAttachmentFiles = (files) => {
  const normalized = normalizeFiles(files);

  if (normalized.length > MAX_QUOTE_ATTACHMENT_FILES) {
    return `Attach up to ${MAX_QUOTE_ATTACHMENT_FILES} photos per quote.`;
  }

  if (normalized.some((file) => !isImageUpload(file))) {
    return 'Only image files are allowed for quote photo attachments.';
  }

  return '';
};

const cleanupUploadedFiles = async (files) => {
  const normalized = normalizeFiles(files);
  await Promise.all(normalized.map(async (file) => {
    const target = file?.path || path.join(UPLOADS_DIR, String(file?.filename || ''));
    if (!target || String(target).endsWith(path.sep)) return;
    try {
      await fs.unlink(target);
    } catch (_error) {
      // Cleanup is best-effort so failed unlinks do not mask the main request error.
    }
  }));
};

const createQuoteAttachmentRows = ({ quoteId, files, uploadedByUserId = null, source = null }) =>
  normalizeFiles(files).map((file) => ({
    quoteId,
    uploadedByUserId,
    source,
    mediaType: isImageUpload(file) ? 'image' : 'document',
    url: `/uploads/${file.filename}`,
    storagePath: file.path || path.join(UPLOADS_DIR, file.filename),
    filename: file.originalname,
    mimeType: file.mimetype || null,
    sizeBytes: Number.isFinite(file.size) ? file.size : null
  }));

const toQuoteAttachmentSummary = (attachment) => ({
  name: attachment?.filename || attachment?.name || null,
  url: attachment?.url || null,
  size: Number.isFinite(Number(attachment?.sizeBytes))
    ? Number(attachment.sizeBytes)
    : (Number.isFinite(Number(attachment?.size)) ? Number(attachment.size) : null),
  mimeType: attachment?.mimeType || attachment?.mimetype || null
});

const sortQuoteAttachments = (attachments) =>
  [...(Array.isArray(attachments) ? attachments : [])].sort((left, right) => {
    const leftTime = Date.parse(left?.createdAt || '') || 0;
    const rightTime = Date.parse(right?.createdAt || '') || 0;
    if (leftTime !== rightTime) return leftTime - rightTime;
    return String(left?.filename || left?.name || '').localeCompare(String(right?.filename || right?.name || ''));
  });

module.exports = {
  MAX_QUOTE_ATTACHMENT_FILES,
  validateQuoteAttachmentFiles,
  cleanupUploadedFiles,
  createQuoteAttachmentRows,
  toQuoteAttachmentSummary,
  sortQuoteAttachments
};
