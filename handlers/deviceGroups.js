// app imports
const { DeviceGroupModel } = require('../models');
const { APIError, parseSkipLimit } = require('../helpers');

async function readDeviceGroups(request, response, next) {
  console.log('readDeviceGroups run')
  let skip = parseSkipLimit(request.query.skip) || 0;
  let limit = parseSkipLimit(request.query.limit, 1000) || 1000;
  if (skip instanceof APIError) {
    return next(skip);
  } else if (limit instanceof APIError) {
    return next(limit);
  }

  try {
    const deviceGroups = await DeviceGroupModel.readDeviceGroups({}, {}, skip, limit);
    return response.json(deviceGroups);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  readDeviceGroups
};
