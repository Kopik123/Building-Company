const ok = (res, data = {}, meta = {}, status = 200) =>
  res.status(status).json({
    data,
    meta
  });

const fail = (res, status, code, message, details) =>
  res.status(status).json({
    error: {
      code,
      message,
      ...(typeof details === 'undefined' ? {} : { details })
    }
  });

module.exports = {
  ok,
  fail
};
