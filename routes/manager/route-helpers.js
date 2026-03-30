const createValidatedHandler = ({ validationResult, asyncHandler }) => (handler) =>
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    return handler(req, res);
  });

// `message` is a local helper option for the 404 response and is not passed to Sequelize.
// Callers must stop execution when this returns null because the 404 response
// has already been sent here.
const findByPkOrRespond = async (Model, id, res, { message, ...options } = {}) => {
  const entity = await Model.findByPk(id, options);
  if (!entity) {
    res.status(404).json({ error: message || `${Model.name} not found` });
    return null;
  }

  return entity;
};

// `message` is a local helper option for the 404 response and is not passed to Sequelize.
// Callers must stop execution when this returns null because the 404 response
// has already been sent here.
const findOneOrRespond = async (Model, where, res, { message, ...options } = {}) => {
  const entity = await Model.findOne({ where, ...options });
  if (!entity) {
    res.status(404).json({ error: message || `${Model.name} not found` });
    return null;
  }

  return entity;
};

const cleanupUploadedFiles = async (files, normalizeStoragePath, safeUnlink) => {
  for (const file of files || []) {
    await safeUnlink(normalizeStoragePath(file.path));
  }
};

module.exports = {
  createValidatedHandler,
  findByPkOrRespond,
  findOneOrRespond,
  cleanupUploadedFiles
};
