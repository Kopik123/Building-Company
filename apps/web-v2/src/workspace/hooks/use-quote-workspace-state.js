import React from 'react';
import { v2Api } from '../../lib/api';
import {
  normalizeText,
  titleCase,
  sortByRecent,
  quoteToFormState,
  createQuoteFormState,
  createEstimateFormState,
  getRemainingQuotePhotoSlots,
  validateQuotePhotoSelection,
  useAsyncState
} from '../kit.jsx';

function useQuoteWorkspaceState({ user, canManageQuotes, canRespondToEstimates }) {
  const quotes = useAsyncState(() => v2Api.getQuotes(), [], []);
  const clients = useAsyncState(() => (canManageQuotes ? v2Api.getCrmClients() : Promise.resolve([])), [canManageQuotes], []);
  const staff = useAsyncState(() => (canManageQuotes ? v2Api.getCrmStaff() : Promise.resolve([])), [canManageQuotes], []);
  const [search, setSearch] = React.useState('');
  const [selectedQuoteId, setSelectedQuoteId] = React.useState('');
  const [isCreatingQuote, setIsCreatingQuote] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [secondaryAction, setSecondaryAction] = React.useState('');
  const isSecondaryBusy = Boolean(secondaryAction);
  const isBusyAction = (action) => secondaryAction == action;
  const [actionError, setActionError] = React.useState('');
  const [actionMessage, setActionMessage] = React.useState('');
  const [form, setForm] = React.useState(() => createQuoteFormState());
  const [quoteFiles, setQuoteFiles] = React.useState([]);
  const [followUpQuoteFiles, setFollowUpQuoteFiles] = React.useState([]);
  const [followUpUploadInputKey, setFollowUpUploadInputKey] = React.useState(0);
  const [estimateForm, setEstimateForm] = React.useState(() => createEstimateFormState());
  const [responseNote, setResponseNote] = React.useState('');
  const [detailState, setDetailState] = React.useState({
    loading: false,
    error: '',
    quote: null,
    estimates: [],
    events: []
  });
  const deferredSearch = React.useDeferredValue(search);
  const managerOptions = staff.data.filter((member) => ['manager', 'admin'].includes(normalizeText(member?.role)));

  const filteredQuotes = sortByRecent(quotes.data, ['updatedAt', 'createdAt']).filter((quote) => {
    const needle = normalizeText(deferredSearch);
    if (!needle) return true;
    return [
      quote?.projectType,
      quote?.location,
      quote?.workflowStatus,
      quote?.status,
      quote?.priority,
      quote?.guestName,
      quote?.guestEmail,
      quote?.guestPhone,
      quote?.client?.email,
      quote?.budgetRange
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  const upsertQuote = (nextQuote) => {
    if (!nextQuote?.id) return;
    quotes.setData((prev) =>
      sortByRecent(
        [nextQuote, ...(Array.isArray(prev) ? prev.filter((quote) => quote.id !== nextQuote.id) : [])],
        ['updatedAt', 'createdAt']
      )
    );
  };

  const onQuoteFilesChange = (event) => {
    const { files, error } = validateQuotePhotoSelection({
      currentFiles: quoteFiles,
      incomingFiles: Array.from(event.target.files || [])
    });
    event.target.value = '';
    setActionError(error);
    setQuoteFiles(files);
  };

  const onFollowUpQuoteFilesChange = (event) => {
    const { files, error } = validateQuotePhotoSelection({
      currentFiles: followUpQuoteFiles,
      incomingFiles: Array.from(event.target.files || []),
      existingAttachmentCount: Number(selectedQuote?.attachmentCount || 0)
    });
    event.target.value = '';
    setActionError(error);
    setFollowUpQuoteFiles(files);
  };

  const loadQuoteWorkspace = async (quoteId = selectedQuoteId) => {
    if (!quoteId) {
      setDetailState({ loading: false, error: '', quote: null, estimates: [], events: [] });
      return null;
    }

    setDetailState((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      const [initialQuote, events, estimates] = await Promise.all([
        v2Api.getQuote(quoteId),
        v2Api.getQuoteTimeline(quoteId),
        v2Api.getQuoteEstimates(quoteId)
      ]);
      const refreshedQuote = await v2Api.getQuote(quoteId).catch(() => initialQuote);

      upsertQuote(refreshedQuote);
      setDetailState({
        loading: false,
        error: '',
        quote: refreshedQuote,
        estimates,
        events
      });
      return {
        quote: refreshedQuote,
        estimates,
        events
      };
    } catch (error) {
      setDetailState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Could not load quote workspace'
      }));
      return null;
    }
  };

  React.useEffect(() => {
    if (isCreatingQuote) return;
    if (!filteredQuotes.length) {
      if (selectedQuoteId) setSelectedQuoteId('');
      return;
    }
    if (!filteredQuotes.some((quote) => quote.id === selectedQuoteId)) {
      setSelectedQuoteId(filteredQuotes[0].id);
    }
  }, [filteredQuotes, selectedQuoteId, isCreatingQuote]);

  React.useEffect(() => {
    if (!canManageQuotes) return;
    if (isCreatingQuote) return;
    const selectedQuote = quotes.data.find((quote) => quote.id === selectedQuoteId);
    if (!selectedQuote) return;
    setForm(quoteToFormState(selectedQuote));
  }, [selectedQuoteId, quotes.data, canManageQuotes, isCreatingQuote]);

  React.useEffect(() => {
    if (isCreatingQuote || !selectedQuoteId) {
      if (isCreatingQuote) {
        setDetailState({ loading: false, error: '', quote: null, estimates: [], events: [] });
      }
      return;
    }
    loadQuoteWorkspace(selectedQuoteId);
  }, [selectedQuoteId, isCreatingQuote]);

  const selectedQuote = detailState.quote || quotes.data.find((quote) => quote.id == selectedQuoteId) || null;
  const remainingQuotePhotoSlots = getRemainingQuotePhotoSlots(selectedQuote);
  const currentEstimate =
    detailState.estimates.find((estimate) => estimate?.isCurrentVersion)
    || detailState.estimates[0]
    || selectedQuote?.latestEstimate
    || null;
  const clientEstimateNeedsDecision =
    canRespondToEstimates
    && currentEstimate
    && normalizeText(currentEstimate.status) === 'sent'
    && ['pending', 'viewed', 'revision_requested'].includes(normalizeText(currentEstimate.decisionStatus));

  React.useEffect(() => {
    if (!selectedQuote || isCreatingQuote) {
      setEstimateForm(createEstimateFormState());
      setResponseNote('');
      return;
    }

    setEstimateForm((prev) => createEstimateFormState({
      title: prev.title || `${titleCase(selectedQuote.projectType || 'Quote')} Offer`,
      total: prev.total,
      description: prev.description || selectedQuote.description || '',
      notes: prev.notes,
      clientMessage: prev.clientMessage
    }));
  }, [selectedQuote, isCreatingQuote]);

  const startNewQuote = () => {
    setIsCreatingQuote(true);
    setSelectedQuoteId('');
    setForm(
      createQuoteFormState({
        assignedManagerId: managerOptions[0]?.id || user?.id || '',
        contactPhone: user?.phone || ''
      })
    );
    setEstimateForm(createEstimateFormState());
    setQuoteFiles([]);
    setFollowUpQuoteFiles([]);
    setFollowUpUploadInputKey((value) => value + 1);
    setResponseNote('');
    setDetailState({ loading: false, error: '', quote: null, estimates: [], events: [] });
    setActionError('');
    setActionMessage('');
  };

  const selectQuote = (quote) => {
    setIsCreatingQuote(false);
    setSelectedQuoteId(quote.id);
    setQuoteFiles([]);
    setFollowUpQuoteFiles([]);
    setFollowUpUploadInputKey((value) => value + 1);
    if (canManageQuotes) setForm(quoteToFormState(quote));
    setActionError('');
    setActionMessage('');
  };

  return {
    quotes,
    clients,
    staff,
    search,
    setSearch,
    selectedQuoteId,
    setSelectedQuoteId,
    isCreatingQuote,
    setIsCreatingQuote,
    saving,
    setSaving,
    secondaryAction,
    setSecondaryAction,
    isSecondaryBusy,
    isBusyAction,
    actionError,
    setActionError,
    actionMessage,
    setActionMessage,
    form,
    setForm,
    quoteFiles,
    setQuoteFiles,
    followUpQuoteFiles,
    setFollowUpQuoteFiles,
    followUpUploadInputKey,
    setFollowUpUploadInputKey,
    estimateForm,
    setEstimateForm,
    responseNote,
    setResponseNote,
    detailState,
    setDetailState,
    managerOptions,
    filteredQuotes,
    selectedQuote,
    remainingQuotePhotoSlots,
    currentEstimate,
    clientEstimateNeedsDecision,
    upsertQuote,
    onQuoteFilesChange,
    onFollowUpQuoteFilesChange,
    loadQuoteWorkspace,
    startNewQuote,
    selectQuote
  };
}

export { useQuoteWorkspaceState };
