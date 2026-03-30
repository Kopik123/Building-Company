const resolveQuery = (reqOrQuery) => {
  if (reqOrQuery && typeof reqOrQuery === 'object' && 'query' in reqOrQuery) {
    return reqOrQuery.query || {};
  }

  return reqOrQuery || {};
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(1, parsed);
};

const paginationDto = (page, pageSize, total) => ({
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize))
});

const createPaginationHelpers = ({ defaultPageSize = 25, maxPageSize = 100 } = {}) => {
  const getPagination = (reqOrQuery) => {
    const query = resolveQuery(reqOrQuery);
    const page = parsePositiveInt(query.page, 1);
    const pageSize = Math.min(maxPageSize, parsePositiveInt(query.pageSize, defaultPageSize));

    return {
      page,
      pageSize,
      offset: (page - 1) * pageSize
    };
  };

  const encodeCursor = (record, { createdAtField = 'createdAt', idField = 'id' } = {}) =>
    Buffer.from(`${new Date(record[createdAtField]).toISOString()}|${record[idField]}`, 'utf8').toString('base64url');

  const decodeCursor = (rawCursor) => {
    if (!rawCursor) return null;

    try {
      const decoded = Buffer.from(String(rawCursor), 'base64url').toString('utf8');
      const [createdAtRaw, id] = decoded.split('|');
      const createdAt = new Date(createdAtRaw);
      if (!id || Number.isNaN(createdAt.getTime())) return null;
      return { createdAt, id };
    } catch (_error) {
      return null;
    }
  };

  const getCursorPagination = (reqOrQuery) => {
    const query = resolveQuery(reqOrQuery);
    const limit = Math.min(maxPageSize, parsePositiveInt(query.limit, defaultPageSize));
    const cursor = decodeCursor(query.cursor);

    if (query.cursor && !cursor) {
      return { error: 'Invalid cursor' };
    }

    return {
      mode: query.cursor || typeof query.limit !== 'undefined' ? 'cursor' : 'legacy',
      limit,
      cursor
    };
  };

  return {
    getPagination,
    paginationDto,
    encodeCursor,
    decodeCursor,
    getCursorPagination
  };
};

module.exports = {
  createPaginationHelpers,
  paginationDto
};
