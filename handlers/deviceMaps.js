
const { DeviceMap } = require('../models');
const { APIError, parseSkipLimit } = require('../helpers');
async function readDeviceMaps(request, response, next) {
  let skip = parseSkipLimit(request.query.skip) || 0;
  let limit = parseSkipLimit(request.query.limit, 1000) || 1000;
  if (skip instanceof APIError) {
    return next(skip);
  } else if (limit instanceof APIError) {
    return next(limit);
  }

  try {
    const deviceMaps = await DeviceMap.readDeviceMaps({}, {}, skip, limit);
    return response.json(deviceMaps);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  readDeviceMaps
};
