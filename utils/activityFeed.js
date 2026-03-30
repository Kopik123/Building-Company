const ACTIVITY_ENTITY_TYPES = Object.freeze([
  'quote',
  'estimate',
  'project',
  'crm_client'
]);

const ACTIVITY_VISIBILITY = Object.freeze([
  'internal',
  'client',
  'public'
]);

const logActivityFailure = (scope, error, meta = {}) => {
  console.warn('Non-blocking activity feed write failed:', {
    scope,
    message: error?.message || String(error),
    ...meta
  });
};

const createActivityEvent = async (ActivityEvent, payload, scope = 'activity_event_create', options = null) => {
  if (typeof ActivityEvent?.create !== 'function') return null;

  try {
    return await ActivityEvent.create({
      visibility: 'internal',
      title: null,
      message: null,
      data: null,
      ...payload
    }, options || undefined);
  } catch (error) {
    logActivityFailure(scope, error, {
      entityType: payload?.entityType,
      entityId: payload?.entityId,
      projectId: payload?.projectId,
      quoteId: payload?.quoteId,
      clientId: payload?.clientId
    });
    return null;
  }
};

module.exports = {
  ACTIVITY_ENTITY_TYPES,
  ACTIVITY_VISIBILITY,
  createActivityEvent
};
