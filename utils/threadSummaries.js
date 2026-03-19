const { Op, fn, col } = require('sequelize');

const THREAD_PREVIEW_LIMIT = 120;

const truncateMessageBody = (body, limit = THREAD_PREVIEW_LIMIT) => {
  const normalized = String(body || '').replaceAll(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
};

const toPlain = (value) => (value?.toJSON ? value.toJSON() : value);

const buildLatestMessageMap = async ({ Model, threadIds, threadKey, include = [], attributes = [] }) => {
  if (!Array.isArray(threadIds) || !threadIds.length || typeof Model?.findAll !== 'function') {
    return new Map();
  }

  const rows = await Model.findAll({
    where: { [threadKey]: { [Op.in]: threadIds } },
    attributes: [threadKey, 'id', 'body', 'createdAt', ...attributes],
    include,
    order: [[threadKey, 'ASC'], ['createdAt', 'DESC'], ['id', 'DESC']]
  });

  const latestByThreadId = new Map();
  rows.forEach((row) => {
    const payload = toPlain(row);
    const key = payload?.[threadKey];
    if (!key || latestByThreadId.has(key)) return;
    latestByThreadId.set(key, payload);
  });
  return latestByThreadId;
};

const attachInboxThreadSummaries = async ({ threads, currentUserId, InboxMessage }) => {
  const plainThreads = Array.isArray(threads) ? threads.map(toPlain) : [];
  const threadIds = plainThreads.map((thread) => thread?.id).filter(Boolean);
  if (!threadIds.length) return plainThreads;

  const [latestByThreadId, unreadRows] = await Promise.all([
    buildLatestMessageMap({
      Model: InboxMessage,
      threadIds,
      threadKey: 'threadId',
      attributes: ['senderId', 'recipientId', 'isRead']
    }),
    typeof InboxMessage?.findAll === 'function'
      ? InboxMessage.findAll({
        attributes: ['threadId', [fn('COUNT', col('id')), 'unreadCount']],
        where: {
          threadId: { [Op.in]: threadIds },
          recipientId: currentUserId,
          isRead: false
        },
        group: ['threadId'],
        raw: true
      })
      : Promise.resolve([])
  ]);

  const unreadByThreadId = new Map(
    unreadRows.map((row) => [row.threadId, Number(row.unreadCount || 0)])
  );

  return plainThreads.map((thread) => {
    const latestMessage = latestByThreadId.get(thread.id) || null;
    return {
      ...thread,
      latestMessagePreview: truncateMessageBody(latestMessage?.body),
      latestMessageAt: latestMessage?.createdAt || null,
      latestMessageSenderId: latestMessage?.senderId || null,
      unreadCount: unreadByThreadId.get(thread.id) || 0
    };
  });
};

const attachGroupThreadSummaries = async ({ threads, GroupMessage, User, senderAttributes = ['id', 'name', 'email', 'role'] }) => {
  const plainThreads = Array.isArray(threads) ? threads.map(toPlain) : [];
  const threadIds = plainThreads.map((thread) => thread?.id).filter(Boolean);
  if (!threadIds.length) return plainThreads;

  const [latestByThreadId, countRows] = await Promise.all([
    buildLatestMessageMap({
      Model: GroupMessage,
      threadIds,
      threadKey: 'groupThreadId',
      include: [{ model: User, as: 'sender', attributes: senderAttributes }],
      attributes: ['senderId']
    }),
    typeof GroupMessage?.findAll === 'function'
      ? GroupMessage.findAll({
        attributes: ['groupThreadId', [fn('COUNT', col('id')), 'messageCount']],
        where: { groupThreadId: { [Op.in]: threadIds } },
        group: ['groupThreadId'],
        raw: true
      })
      : Promise.resolve([])
  ]);

  const countByThreadId = new Map(
    countRows.map((row) => [row.groupThreadId, Number(row.messageCount || 0)])
  );

  return plainThreads.map((thread) => {
    const latestMessage = latestByThreadId.get(thread.id) || null;
    return {
      ...thread,
      latestMessagePreview: truncateMessageBody(latestMessage?.body),
      latestMessageAt: latestMessage?.createdAt || null,
      latestMessageSender: latestMessage?.sender || null,
      messageCount: countByThreadId.get(thread.id) || 0
    };
  });
};

module.exports = {
  truncateMessageBody,
  attachInboxThreadSummaries,
  attachGroupThreadSummaries
};
