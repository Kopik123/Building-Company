const createValidatedHandler = ({ validationResult, asyncHandler }) => (handler) =>
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    return handler(req, res);
  });

const findByPkOrRespond = async (Model, id, res, { message, ...options } = {}) => {
  const entity = await Model.findByPk(id, options);
  if (!entity) {
    res.status(404).json({ error: message || `${Model.name} not found` });
    return null;
  }

  return entity;
};

const findOneOrRespond = async (Model, where, res, options = {}) => {
  const entity = await Model.findOne({ where, ...options });
  if (!entity) {
    res.status(404).json({ error: options.message || `${Model.name} not found` });
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
