// app imports
const { DeviceSpecificationModel } = require('../models');
const { APIError, parseSkipLimit } = require('../helpers');

async function readDeviceSpecifications(request, response, next) {
  let skip = parseSkipLimit(request.query.skip) || 0;
  let limit = parseSkipLimit(request.query.limit, 1000) || 1000;
  if (skip instanceof APIError) {
    return next(skip);
  } else if (limit instanceof APIError) {
    return next(limit);
  }

  try {
    const deviceSpecifications = await DeviceSpecificationModel.readDeviceSpecifications({}, {}, skip, limit);
    return response.json(deviceSpecifications);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  readDeviceSpecifications
};
