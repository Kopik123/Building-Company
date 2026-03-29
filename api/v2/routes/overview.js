const express = require('express');
const { Op, fn, col } = require('sequelize');
const {
  Estimate,
  GroupMember,
  GroupMessage,
  GroupThread,
  InboxMessage,
  InboxThread,
  Material,
  Notification,
  Project,
  ProjectMedia,
  Quote,
  NewQuote,
  QuoteAttachment,
  ServiceOffering,
  User
} = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { roleCheckV2 } = require('../middleware/roles');
const { ok } = require('../utils/response');
const { attachGroupThreadSummaries, attachInboxThreadSummaries } = require('../../../utils/threadSummaries');
const {
  PROJECT_STATUSES,
  QUOTE_PRIORITIES,
  QUOTE_STATUSES,
  QUOTE_WORKFLOW_STATUSES
} = require('@building-company/contracts-v2');
const {
  normalizeEstimateDecisionStatus,
  normalizeWorkflowStatus
} = require('../../../utils/quoteWorkflow');
const { sortQuoteAttachments, toQuoteAttachmentSummary } = require('../../../utils/quoteAttachments');
const { toNewQuoteSummary } = require('../../../utils/newQuoteShape');

const router = express.Router();
const ACTIVE_PROJECT_STATUSES = ['planning', 'in_progress', 'on_hold'];
const OPEN_QUOTE_STATUSES = ['pending', 'in_progress'];
const senderAttributes = ['id', 'name', 'email', 'role'];
const threadUserAttributes = ['id', 'name', 'email', 'role'];
const projectThreadAttributes = ['id', 'title', 'location', 'status', 'quoteId', 'clientId', 'assignedManagerId'];
const quoteThreadAttributes = ['id', 'projectType', 'location', 'status', 'clientId', 'assignedManagerId'];
const directThreadAttributes = ['id', 'name', 'email', 'role'];

const toPlain = (value) => (value?.toJSON ? value.toJSON() : value);

const quoteIncludes = [
  { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone', 'companyName'], required: false },
  { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email', 'phone', 'role'], required: false },
  {
    model: Estimate,
    as: 'currentEstimate',
    attributes: ['id', 'quoteId', 'projectId', 'title', 'status', 'decisionStatus', 'versionNumber', 'isCurrentVersion', 'notes', 'clientMessage', 'subtotal', 'total', 'sentAt', 'viewedAt', 'respondedAt', 'approvedAt', 'declinedAt', 'createdAt', 'updatedAt'],
    include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false }],
    required: false
  },
  {
    model: QuoteAttachment,
    as: 'attachments',
    attributes: ['id', 'filename', 'url', 'mimeType', 'sizeBytes', 'createdAt', 'updatedAt'],
    required: false,
    separate: true,
    order: [['createdAt', 'ASC']]
  }
];

const projectIncludes = [
  { model: User, as: 'client', attributes: ['id', 'name', 'email'], required: false },
  { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
  { model: Quote, as: 'quote', attributes: ['id', 'status', 'projectType', 'location'], required: false }
];

const groupThreadIncludes = [
  { model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false },
  { model: Quote, as: 'quote', attributes: quoteThreadAttributes, required: false },
  { model: Project, as: 'project', attributes: projectThreadAttributes, required: false },
  {
    model: GroupMember,
    as: 'members',
    required: false,
    include: [{ model: User, as: 'user', attributes: threadUserAttributes }]
  }
];

const directThreadIncludes = [
  { model: User, as: 'participantA', attributes: directThreadAttributes, required: false },
  { model: User, as: 'participantB', attributes: directThreadAttributes, required: false }
];

const normalizeAttachmentList = (attachments) =>
  sortQuoteAttachments(Array.isArray(attachments) ? attachments : []).map(toQuoteAttachmentSummary);

const hydrateQuotePayload = (quote) => {
  const plain = toPlain(quote) || {};
  const latestEstimate = plain.currentEstimate || null;
  const attachments = normalizeAttachmentList(plain.attachments);
  return {
    ...plain,
    status: QUOTE_STATUSES.includes(String(plain.status || '').trim().toLowerCase()) ? plain.status : QUOTE_STATUSES[0],
    workflowStatus: normalizeWorkflowStatus(plain.workflowStatus || plain.status),
    priority: QUOTE_PRIORITIES.includes(String(plain.priority || '').trim().toLowerCase()) ? plain.priority : QUOTE_PRIORITIES[0],
    attachments,
    attachmentCount: attachments.length,
    latestEstimate,
    estimateCount: Number(plain.estimateCount || (latestEstimate ? 1 : 0)),
    canConvertToProject: Boolean(
      !plain.convertedProjectId
      && normalizeWorkflowStatus(plain.workflowStatus || plain.status) === 'approved_ready_for_project'
      && normalizeEstimateDecisionStatus(latestEstimate?.decisionStatus) === 'accepted'
    )
  };
};

const buildProjectMediaCountMap = async (projectIds) => {
  const uniqueProjectIds = Array.from(new Set((projectIds || []).filter(Boolean)));
  if (!uniqueProjectIds.length || typeof ProjectMedia?.findAll !== 'function') return new Map();

  const rows = await ProjectMedia.findAll({
    attributes: ['projectId', 'mediaType', [fn('COUNT', col('id')), 'count']],
    where: { projectId: { [Op.in]: uniqueProjectIds } },
    group: ['projectId', 'mediaType'],
    raw: true
  });

  const mediaCountByProjectId = new Map();
  uniqueProjectIds.forEach((projectId) => {
    mediaCountByProjectId.set(projectId, { imageCount: 0, documentCount: 0 });
  });

  rows.forEach((row) => {
    const counts = mediaCountByProjectId.get(row.projectId) || { imageCount: 0, documentCount: 0 };
    const count = Number.parseInt(row.count, 10) || 0;
    if (row.mediaType === 'image') counts.imageCount = count;
    if (row.mediaType === 'document') counts.documentCount = count;
    mediaCountByProjectId.set(row.projectId, counts);
  });

  return mediaCountByProjectId;
};

const projectDto = (project, mediaCountByProjectId) => {
  const plain = toPlain(project) || {};
  const counts = mediaCountByProjectId?.get(plain.id) || { imageCount: 0, documentCount: 0 };
  return {
    ...plain,
    status: PROJECT_STATUSES.includes(String(plain.status || '').trim().toLowerCase()) ? plain.status : PROJECT_STATUSES[0],
    imageCount: Number.parseInt(counts.imageCount, 10) || 0,
    documentCount: Number.parseInt(counts.documentCount, 10) || 0,
    media: Array.isArray(plain.media) ? plain.media : []
  };
};

const getCurrentMembershipRole = (thread, userId) =>
  thread?.members?.find((member) => member.userId === userId)?.role || null;

const serializeThread = (thread, userId) => {
  const payload = toPlain(thread) || {};
  return {
    ...payload,
    memberCount: Array.isArray(payload.members) ? payload.members.length : 0,
    currentUserMembershipRole: getCurrentMembershipRole(payload, userId)
  };
};

const getDirectThreadCounterparty = (thread, userId) => {
  const payload = toPlain(thread) || {};
  if (payload.participantAId === userId) return payload.participantB || null;
  if (payload.participantBId === userId) return payload.participantA || null;
  return payload.participantA || payload.participantB || null;
};

const sortByRecent = (items) => (Array.isArray(items) ? items.slice().sort((left, right) => {
  const leftTime = Date.parse(left?.updatedAt || left?.createdAt || 0) || 0;
  const rightTime = Date.parse(right?.updatedAt || right?.createdAt || 0) || 0;
  return rightTime - leftTime;
}) : []);

const serializeDirectThread = (thread, userId) => {
  const payload = toPlain(thread) || {};
  return {
    ...payload,
    participantCount: 2,
    counterparty: getDirectThreadCounterparty(payload, userId)
  };
};

router.get(
  '/',
  [authV2, roleCheckV2('client', 'employee', 'manager', 'admin')],
  asyncHandler(async (req, res) => {
    const staffMode = ['employee', 'manager', 'admin'].includes(String(req.v2User.role || '').toLowerCase());
    const projectWhere = req.v2User.role === 'client'
      ? { clientId: req.v2User.id, isActive: true }
      : {};
    const quoteWhere = req.v2User.role === 'client'
      ? { clientId: req.v2User.id }
      : {};
    const directThreadWhere = {
      [Op.or]: [{ participantAId: req.v2User.id }, { participantBId: req.v2User.id }]
    };

    const [
      recentProjects,
      projectCount,
      activeProjectCount,
      recentQuotes,
      quoteCount,
      openQuoteCount,
      recentNewQuotes,
      newQuoteCount,
      memberships,
      projectThreadCount,
      directThreads,
      directThreadCount,
      notifications,
      unreadNotificationCount,
      clientCount,
      staffCount,
      materials,
      publicServices
    ] = await Promise.all([
      Project.findAll({
        where: projectWhere,
        include: projectIncludes,
        order: [['updatedAt', 'DESC']],
        limit: 3
      }),
      Project.count({ where: projectWhere }),
      Project.count({
        where: {
          ...projectWhere,
          status: { [Op.in]: ACTIVE_PROJECT_STATUSES }
        }
      }),
      Quote.findAll({
        where: quoteWhere,
        include: quoteIncludes,
        order: [['updatedAt', 'DESC']],
        limit: 3
      }),
      Quote.count({ where: quoteWhere }),
      Quote.count({
        where: {
          ...quoteWhere,
          status: { [Op.in]: OPEN_QUOTE_STATUSES }
        }
      }),
      !staffMode && typeof NewQuote?.findAll === 'function'
        ? NewQuote.findAll({
          where: { clientId: req.v2User.id },
          order: [['updatedAt', 'DESC'], ['createdAt', 'DESC']],
          limit: 3
        })
        : Promise.resolve([]),
      !staffMode && typeof NewQuote?.count === 'function'
        ? NewQuote.count({ where: { clientId: req.v2User.id } })
        : Promise.resolve(0),
      GroupMember.findAll({
        where: { userId: req.v2User.id },
        include: [{ model: GroupThread, as: 'thread', include: groupThreadIncludes }],
        order: [[{ model: GroupThread, as: 'thread' }, 'updatedAt', 'DESC']],
        limit: 4
      }),
      GroupMember.count({ where: { userId: req.v2User.id } }),
      InboxThread.findAll({
        where: directThreadWhere,
        include: directThreadIncludes,
        order: [['updatedAt', 'DESC']],
        limit: 2
      }),
      InboxThread.count({ where: directThreadWhere }),
      Notification.findAll({
        where: { userId: req.v2User.id },
        order: [['createdAt', 'DESC']],
        limit: 4
      }),
      Notification.count({ where: { userId: req.v2User.id, isRead: false } }),
      staffMode ? User.count({ where: { role: 'client', isActive: true } }) : Promise.resolve(0),
      staffMode ? User.count({ where: { role: { [Op.in]: ['employee', 'manager', 'admin'] }, isActive: true } }) : Promise.resolve(0),
      staffMode
        ? Material.findAll({
          where: { isActive: true },
          order: [['updatedAt', 'DESC']]
        })
        : Promise.resolve([]),
      !staffMode
        ? ServiceOffering.findAll({
          where: { showOnWebsite: true, isActive: true },
          order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']],
          limit: 4
        })
        : Promise.resolve([])
    ]);

    const mediaCountByProjectId = await buildProjectMediaCountMap(recentProjects.map((project) => project.id));
    const projectThreads = memberships
      .map((membership) => (membership.thread ? serializeThread(membership.thread, req.v2User.id) : null))
      .filter(Boolean);
    const [summarizedProjectThreads, summarizedDirectThreads] = await Promise.all([
      attachGroupThreadSummaries({
        threads: projectThreads,
        GroupMessage,
        User,
        senderAttributes
      }),
      attachInboxThreadSummaries({
        threads: directThreads.map((thread) => serializeDirectThread(thread, req.v2User.id)),
        currentUserId: req.v2User.id,
        InboxMessage
      })
    ]);

    const lowStockMaterials = staffMode
      ? materials.filter((material) => Number(material?.stockQty || 0) <= Number(material?.minStockQty || 0))
      : [];
    const stagedQuotes = !staffMode
      ? (Array.isArray(recentNewQuotes) ? recentNewQuotes : []).map(toNewQuoteSummary)
      : [];
    const mergedClientQuotes = !staffMode
      ? sortByRecent([
        ...recentQuotes.map(hydrateQuotePayload),
        ...stagedQuotes
      ]).slice(0, 3)
      : recentQuotes.map(hydrateQuotePayload);

    return ok(res, {
      overview: {
        metrics: {
          projectCount,
          activeProjectCount,
          quoteCount: staffMode ? quoteCount : quoteCount + Number(newQuoteCount || 0),
          openQuoteCount: staffMode ? openQuoteCount : openQuoteCount + Number(newQuoteCount || 0),
          projectThreadCount,
          directThreadCount,
          unreadNotificationCount,
          clientCount: staffMode ? clientCount : 0,
          staffCount: staffMode ? staffCount : 0,
          lowStockMaterialCount: staffMode ? lowStockMaterials.length : 0,
          publicServiceCount: staffMode ? 0 : publicServices.length
        },
        projects: recentProjects.map((project) => projectDto(project, mediaCountByProjectId)),
        quotes: mergedClientQuotes,
        threads: summarizedProjectThreads,
        directThreads: summarizedDirectThreads,
        notifications,
        lowStockMaterials: staffMode ? lowStockMaterials.slice(0, 4) : [],
        publicServices: staffMode ? [] : publicServices,
        crm: {
          clientCount: staffMode ? clientCount : 0,
          staffCount: staffMode ? staffCount : 0
        }
      }
    });
  })
);

module.exports = router;
