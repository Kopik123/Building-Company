const CLIENT_LIFECYCLE_STATUSES = Object.freeze([
  'lead',
  'quoted',
  'approved',
  'active_project',
  'completed',
  'archived'
]);

const lifecycleOrder = new Map(CLIENT_LIFECYCLE_STATUSES.map((status, index) => [status, index]));

const normalizeClientLifecycleStatus = (value, fallback = CLIENT_LIFECYCLE_STATUSES[0]) => {
  const normalized = String(value || '').trim().toLowerCase();
  return lifecycleOrder.has(normalized) ? normalized : fallback;
};

const shouldAdvanceLifecycle = (currentStatus, nextStatus) =>
  lifecycleOrder.get(normalizeClientLifecycleStatus(nextStatus)) > lifecycleOrder.get(normalizeClientLifecycleStatus(currentStatus));

const buildLifecyclePayload = (status) => ({
  crmLifecycleStatus: normalizeClientLifecycleStatus(status),
  crmLifecycleUpdatedAt: new Date()
});

const advanceClientLifecycle = async (clientRecord, nextStatus) => {
  if (!clientRecord || typeof clientRecord.update !== 'function') return clientRecord || null;
  if (!shouldAdvanceLifecycle(clientRecord.crmLifecycleStatus, nextStatus)) return clientRecord;
  await clientRecord.update(buildLifecyclePayload(nextStatus));
  return clientRecord;
};

module.exports = {
  CLIENT_LIFECYCLE_STATUSES,
  normalizeClientLifecycleStatus,
  shouldAdvanceLifecycle,
  buildLifecyclePayload,
  advanceClientLifecycle
};
