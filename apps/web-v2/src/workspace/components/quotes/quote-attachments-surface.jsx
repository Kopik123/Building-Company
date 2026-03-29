import { Surface, getSelectedFileKey, QuoteAttachmentList, MAX_QUOTE_PHOTO_FILES } from '../../kit.jsx';

function QuoteAttachmentsSurface({ quoteAttachmentsPanel }) {
  const {
    canManageQuotes,
    selectedQuote,
    isCreatingQuote,
    followUpUploadInputKey,
    onFollowUpQuoteFilesChange,
    remainingQuotePhotoSlots,
    followUpQuoteFiles,
    onUploadFollowUpPhotos,
    isSecondaryBusy,
    isBusyAction
  } = quoteAttachmentsPanel;

  if (!selectedQuote || isCreatingQuote) return null;

  return (
    <Surface
      eyebrow="Attachments"
      title="Quote photos"
      description={
        canManageQuotes
          ? 'Reference images attached by the client or operations team for this quote.'
          : 'Reference images attached to your quote request.'
      }
    >
      <QuoteAttachmentList attachments={selectedQuote.attachments} />
      {!canManageQuotes ? (
        <div className="editor-form">
          <label className="file-input">
            <span>Add more reference photos</span>
            <input key={followUpUploadInputKey} type="file" accept="image/*" multiple onChange={onFollowUpQuoteFilesChange} />
          </label>
          <p className="muted">
            {remainingQuotePhotoSlots > 0
              ? `This quote currently stores ${selectedQuote.attachmentCount || 0} of ${MAX_QUOTE_PHOTO_FILES} photos. You can add ${remainingQuotePhotoSlots} more.`
              : `This quote already stores the maximum ${MAX_QUOTE_PHOTO_FILES} photos.`}
          </p>
          {followUpQuoteFiles.length ? (
            <div className="attachment-list">
              {followUpQuoteFiles.map((file) => (
                <span key={getSelectedFileKey(file)} className="attachment-chip attachment-chip--muted">
                  {file.name}
                </span>
              ))}
            </div>
          ) : null}
          <div className="action-row">
            <button type="button" onClick={onUploadFollowUpPhotos} disabled={!followUpQuoteFiles.length || isSecondaryBusy || remainingQuotePhotoSlots <= 0}>
              {isBusyAction('follow-up-upload') ? 'Uploading...' : 'Upload more photos'}
            </button>
          </div>
        </div>
      ) : null}
    </Surface>
  );
}

export { QuoteAttachmentsSurface };
