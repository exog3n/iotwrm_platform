// app imports
const { Measurement } = require('../models');
const { APIError, parseSkipLimit } = require('../helpers');

async function readMeasurements(request, response, next) {
  let skip = parseSkipLimit(request.query.skip) || 0;
  let limit = parseSkipLimit(request.query.limit, 1000) || 1000;
  if (skip instanceof APIError) {
    return next(skip);
  } else if (limit instanceof APIError) {
    return next(limit);
  }

  try {
    const measurements = await Measurement.readMeasurements({}, {}, skip, limit);
    return response.json(measurements);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  readMeasurements
};
