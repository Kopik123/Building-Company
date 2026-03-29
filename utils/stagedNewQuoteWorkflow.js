const {
  buildNewQuoteProjectTitle,
  cleanupNewQuoteStoredAttachments,
  toNewQuoteProjectMediaRows
} = require('./newQuoteShape');

const defaultAcceptClientNotification = ({ newQuote, project, groupThread }) => ({
  type: 'project_created',
  title: `Project created: ${project.title}`,
  body: `Your request ${newQuote.quoteRef} has been accepted and converted into project "${project.title}".`,
  data: {
    projectId: project.id,
    newQuoteId: newQuote.id,
    quoteRef: newQuote.quoteRef,
    groupThreadId: groupThread?.id || null
  }
});

const defaultAcceptActivity = ({ newQuote, actorUser, project, groupThread }) => ({
  actorUserId: actorUser.id,
  entityType: 'project',
  entityId: project.id,
  projectId: project.id,
  clientId: newQuote.clientId || null,
  visibility: 'client',
  eventType: 'project_created_from_new_quote',
  title: 'Project created',
  message: `Quote request ${newQuote.quoteRef} was accepted and converted into project "${project.title}".`,
  data: {
    quoteRef: newQuote.quoteRef,
    projectId: project.id,
    groupThreadId: groupThread?.id || null
  }
});

const defaultRejectClientNotification = ({ newQuote }) => ({
  type: 'quote_rejected',
  title: `Quote request not progressed: ${newQuote.quoteRef}`,
  body: `Your request ${newQuote.quoteRef} was not progressed and has been removed from review.`,
  data: {
    newQuoteId: newQuote.id,
    quoteRef: newQuote.quoteRef
  }
});

const defaultRejectActivity = ({ newQuote, actorUser }) => ({
  actorUserId: actorUser.id,
  entityType: 'new_quote',
  entityId: newQuote.id,
  clientId: newQuote.clientId || null,
  visibility: 'internal',
  eventType: 'new_quote_rejected',
  title: 'Staged quote rejected',
  message: `Quote request ${newQuote.quoteRef} was rejected and removed from staging.`,
  data: {
    quoteRef: newQuote.quoteRef
  }
});

const ensureGroupMember = async ({ GroupMember, groupThreadId, userId, role }) => {
  if (!groupThreadId || !userId || !GroupMember) return;

  if (typeof GroupMember.findOrCreate === 'function') {
    await GroupMember.findOrCreate({
      where: { groupThreadId, userId },
      defaults: { groupThreadId, userId, role }
    });
    return;
  }

  if (typeof GroupMember.create === 'function') {
    await GroupMember.create({ groupThreadId, userId, role });
  }
};

const createStagedNewQuoteWorkflow = ({
  Project,
  ProjectMedia,
  GroupThread,
  GroupMember,
  Notification,
  User,
  ActivityEvent,
  advanceClientLifecycle,
  createActivityEvent
}) => ({
  async accept(newQuote, actorUser, options = {}) {
    if (!newQuote) return null;

    const project = await Project.create({
      title: buildNewQuoteProjectTitle(newQuote),
      quoteId: null,
      acceptedEstimateId: null,
      clientId: newQuote.clientId,
      assignedManagerId: actorUser.id,
      location: newQuote.location || null,
      description: newQuote.description || null,
      budgetEstimate: newQuote.budgetRange || null,
      status: 'planning',
      isActive: true
    });

    if (typeof ProjectMedia?.bulkCreate === 'function') {
      const mediaRows = toNewQuoteProjectMediaRows(newQuote, project.id);
      if (mediaRows.length) {
        await ProjectMedia.bulkCreate(mediaRows);
      }
    }

    let groupThread = null;
    if (typeof GroupThread?.create === 'function') {
      groupThread = await GroupThread.create({
        name: project.title,
        quoteId: null,
        projectId: project.id,
        createdBy: actorUser.id
      });

      await ensureGroupMember({
        GroupMember,
        groupThreadId: groupThread.id,
        userId: actorUser.id,
        role: 'admin'
      });

      if (newQuote.clientId) {
        await ensureGroupMember({
          GroupMember,
          groupThreadId: groupThread.id,
          userId: newQuote.clientId,
          role: 'member'
        });
      }
    }

    const clientRecord = typeof User?.findByPk === 'function' && newQuote.clientId
      ? await User.findByPk(newQuote.clientId)
      : null;
    await advanceClientLifecycle(clientRecord, 'active_project');

    const buildAcceptClientNotification = options.buildAcceptClientNotification || defaultAcceptClientNotification;
    const clientNotification = buildAcceptClientNotification({ newQuote, actorUser, project, groupThread });
    if (newQuote.clientId && clientNotification && typeof Notification?.create === 'function') {
      await Notification.create({
        userId: clientNotification.userId || newQuote.clientId,
        ...clientNotification
      });
    }

    const buildAcceptActivity = options.buildAcceptActivity || defaultAcceptActivity;
    const acceptActivity = buildAcceptActivity({ newQuote, actorUser, project, groupThread });
    if (acceptActivity) {
      await createActivityEvent(
        ActivityEvent,
        acceptActivity,
        options.acceptActivityContext || 'staged_new_quote_accept_activity'
      );
    }

    await newQuote.destroy();
    return { project, groupThread };
  },

  async reject(newQuote, actorUser, options = {}) {
    if (!newQuote) return null;

    const buildRejectClientNotification = options.buildRejectClientNotification || defaultRejectClientNotification;
    const clientNotification = buildRejectClientNotification({ newQuote, actorUser });
    if (newQuote.clientId && clientNotification && typeof Notification?.create === 'function') {
      await Notification.create({
        userId: clientNotification.userId || newQuote.clientId,
        ...clientNotification
      });
    }

    const buildRejectActivity = options.buildRejectActivity || defaultRejectActivity;
    const rejectActivity = buildRejectActivity({ newQuote, actorUser });
    if (rejectActivity) {
      await createActivityEvent(
        ActivityEvent,
        rejectActivity,
        options.rejectActivityContext || 'staged_new_quote_reject_activity'
      );
    }

    await cleanupNewQuoteStoredAttachments(newQuote);
    await newQuote.destroy();
    return {
      newQuoteId: newQuote.id,
      quoteRef: newQuote.quoteRef
    };
  }
});

module.exports = {
  createStagedNewQuoteWorkflow
};
