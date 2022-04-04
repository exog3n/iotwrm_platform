// app imports
const { MicroControler } = require('../models');
const { APIError, parseSkipLimit } = require('../helpers');

async function readMicroControlers(request, response, next) {
  let skip = parseSkipLimit(request.query.skip) || 0;
  let limit = parseSkipLimit(request.query.limit, 1000) || 1000;
  if (skip instanceof APIError) {
    return next(skip);
  } else if (limit instanceof APIError) {
    return next(limit);
  }

  try {
    const MicroControlers = await MicroControler.readMicroControlers({}, {}, skip, limit);
    return response.json(MicroControlers);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  readMicroControlers
};
