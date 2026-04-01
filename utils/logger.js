let SystemLog;

const getModel = () => {
  if (!SystemLog) {
    try {
      SystemLog = require('../models/SystemLog');
    } catch (_) {
      SystemLog = null;
    }
  }
  return SystemLog;
};

const writeLog = async (data) => {
  const Model = getModel();
  if (!Model) return;
  try {
    await Model.create({
      category: data.category || 'site',
      level: data.level || 'info',
      message: String(data.message || '').slice(0, 2000),
      meta: data.meta || null,
      userId: data.userId || null,
      ip: data.ip ? String(data.ip).slice(0, 64) : null,
      method: data.method ? String(data.method).slice(0, 16) : null,
      path: data.path ? String(data.path).slice(0, 512) : null,
      statusCode: Number.isInteger(data.statusCode) ? data.statusCode : null
    });
  } catch (err) {
    console.error('[logger] Failed to write system log:', err.message);
  }
};

const resolveIp = (req) => {
  return String(req.ip || req.socket?.remoteAddress || '').slice(0, 64);
};

const logSiteRequest = async (req, res) => {
  const userId = req.user?.id || null;
  await writeLog({
    category: 'site',
    level: 'info',
    message: `${req.method} ${req.path} ${res.statusCode}`,
    userId,
    ip: resolveIp(req),
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    meta: { userAgent: String(req.headers['user-agent'] || '').slice(0, 256) }
  });
};

const logVisit = async (req) => {
  await writeLog({
    category: 'visit',
    level: 'info',
    message: `Page visit: ${req.path}`,
    userId: req.user?.id || null,
    ip: resolveIp(req),
    method: req.method,
    path: req.path,
    statusCode: null,
    meta: {
      referer: String(req.headers['referer'] || '').slice(0, 256),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 256)
    }
  });
};

const logUserAction = async (userId, action, meta = null, req = null) => {
  await writeLog({
    category: 'user_action',
    level: 'info',
    message: action,
    userId,
    ip: req ? resolveIp(req) : null,
    method: req?.method || null,
    path: req?.path || null,
    meta
  });
};

const logDbEvent = async (message, level = 'info', meta = null) => {
  await writeLog({
    category: 'database',
    level,
    message,
    meta
  });
};

const logError = async (message, meta = null, req = null, userId = null) => {
  await writeLog({
    category: 'error',
    level: 'error',
    message,
    userId: userId || req?.user?.id || null,
    ip: req ? resolveIp(req) : null,
    method: req?.method || null,
    path: req?.path || null,
    meta
  });
};

const requestLogger = () => (req, res, next) => {
  res.on('finish', () => {
    const path = String(req.path || '');
    if (path.startsWith('/api/') || path === '/healthz') return;
    if (req.method !== 'GET') return;
    const isHtmlPage = !path.includes('.') || path.endsWith('.html');
    if (isHtmlPage) {
      logVisit(req).catch(() => {});
    }
  });
  next();
};

module.exports = {
  writeLog,
  logSiteRequest,
  logVisit,
  logUserAction,
  logDbEvent,
  logError,
  requestLogger
};
