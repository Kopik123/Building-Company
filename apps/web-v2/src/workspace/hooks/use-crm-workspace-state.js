import React from 'react';
import { v2Api } from '../../lib/api';
import {
  normalizeText,
  createStaffFormState,
  createClientEditorState,
  createStaffEditorState,
  clientToFormState,
  staffToFormState,
  useAsyncState
} from '../kit.jsx';

function useCrmWorkspaceState({ canEditPeople }) {
  const clients = useAsyncState(() => v2Api.getCrmClients(), [], []);
  const staff = useAsyncState(() => v2Api.getCrmStaff(), [], []);
  const [search, setSearch] = React.useState('');
  const [staffForm, setStaffForm] = React.useState(() => createStaffFormState());
  const [selectedClientId, setSelectedClientId] = React.useState('');
  const [selectedStaffId, setSelectedStaffId] = React.useState('');
  const [clientForm, setClientForm] = React.useState(() => createClientEditorState());
  const [staffEditorForm, setStaffEditorForm] = React.useState(() => createStaffEditorState());
  const [saving, setSaving] = React.useState(false);
  const [clientSaving, setClientSaving] = React.useState(false);
  const [staffSaving, setStaffSaving] = React.useState(false);
  const [actionError, setActionError] = React.useState('');
  const [actionMessage, setActionMessage] = React.useState('');
  const [clientError, setClientError] = React.useState('');
  const [clientMessage, setClientMessage] = React.useState('');
  const [staffError, setStaffError] = React.useState('');
  const [staffMessage, setStaffMessage] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);

  const filteredClients = clients.data.filter((client) =>
    [client?.name, client?.email, client?.phone, client?.companyName, client?.crmLifecycleStatus].join(' ').toLowerCase().includes(normalizeText(deferredSearch))
  );
  const filteredStaff = staff.data.filter((member) =>
    [member?.name, member?.email, member?.role].join(' ').toLowerCase().includes(normalizeText(deferredSearch))
  );
  const selectedClient = clients.data.find((client) => client.id === selectedClientId) || null;
  const selectedStaff = staff.data.find((member) => member.id === selectedStaffId) || null;
  const clientActivity = useAsyncState(
    () => (canEditPeople && selectedClientId ? v2Api.getClientActivity(selectedClientId, { pageSize: 8 }) : Promise.resolve([])),
    [canEditPeople, selectedClientId],
    []
  );

  const onStaffFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setStaffForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const onClientFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setClientForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const onStaffEditorFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setStaffEditorForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  React.useEffect(() => {
    if (!canEditPeople) return;
    if (!filteredClients.length) {
      if (selectedClientId) setSelectedClientId('');
      return;
    }
    if (!filteredClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(filteredClients[0].id);
    }
  }, [filteredClients, selectedClientId, canEditPeople]);

  React.useEffect(() => {
    if (!canEditPeople) return;
    if (!filteredStaff.length) {
      if (selectedStaffId) setSelectedStaffId('');
      return;
    }
    if (!filteredStaff.some((member) => member.id === selectedStaffId)) {
      setSelectedStaffId(filteredStaff[0].id);
    }
  }, [filteredStaff, selectedStaffId, canEditPeople]);

  React.useEffect(() => {
    if (!canEditPeople || !selectedClient) return;
    setClientForm(clientToFormState(selectedClient));
  }, [selectedClient, canEditPeople]);

  React.useEffect(() => {
    if (!canEditPeople || !selectedStaff) return;
    setStaffEditorForm(staffToFormState(selectedStaff));
  }, [selectedStaff, canEditPeople]);

  return {
    clients,
    staff,
    search,
    setSearch,
    staffForm,
    setStaffForm,
    selectedClientId,
    setSelectedClientId,
    selectedStaffId,
    setSelectedStaffId,
    clientForm,
    setClientForm,
    staffEditorForm,
    setStaffEditorForm,
    saving,
    setSaving,
    clientSaving,
    setClientSaving,
    staffSaving,
    setStaffSaving,
    actionError,
    setActionError,
    actionMessage,
    setActionMessage,
    clientError,
    setClientError,
    clientMessage,
    setClientMessage,
    staffError,
    setStaffError,
    staffMessage,
    setStaffMessage,
    filteredClients,
    filteredStaff,
    selectedClient,
    selectedStaff,
    clientActivity,
    onStaffFieldChange,
    onClientFieldChange,
    onStaffEditorFieldChange
  };
}

export { useCrmWorkspaceState };
