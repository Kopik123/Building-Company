function PrivateInboxComposer({
  selectedThread,
  staffMode,
  canStartThread,
  recipientLabel,
  peopleDirectory,
  recipientEmail,
  setRecipientEmail,
  subject,
  setSubject,
  draft,
  setDraft,
  onSubmit,
  selectedFiles,
  setSelectedFiles,
  composerError,
  sending
}) {
  if (!canStartThread) {
    return null;
  }

  return (
    <form className="composer" onSubmit={onSubmit}>
      {!selectedThread ? (
        <>
          {staffMode ? (
            <label>
              Recipient email
              <input
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                list="private-inbox-people"
                placeholder="Choose an existing client or staff email"
              />
              <datalist id="private-inbox-people">
                {peopleDirectory.map((person) => (
                  <option key={person.id} value={person.email}>
                    {person.name || person.email}
                  </option>
                ))}
              </datalist>
            </label>
          ) : (
            <p className="muted">Recipient: {recipientLabel}</p>
          )}
          {staffMode ? (
            <label>
              Subject
              <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Private conversation subject" />
            </label>
          ) : null}
        </>
      ) : null}
      <label>
        Message
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={selectedThread ? 'Write the next private update or decision.' : 'Write the opening private message.'}
          rows={4}
        />
      </label>
      <div className="composer-actions">
        <label className="file-input">
          <span>Attach files</span>
          <input type="file" multiple onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))} />
        </label>
        <button type="submit" disabled={sending}>
          {sending ? 'Sending...' : selectedThread ? 'Send private update' : 'Open private route'}
        </button>
      </div>
      {selectedFiles.length ? (
        <div className="attachment-list">
          {selectedFiles.map((file) => (
            <span key={`${file.name}-${file.size}`} className="attachment-chip attachment-chip--muted">
              {file.name}
            </span>
          ))}
        </div>
      ) : null}
      {composerError ? <p className="error">{composerError}</p> : null}
    </form>
  );
}

export { PrivateInboxComposer };
