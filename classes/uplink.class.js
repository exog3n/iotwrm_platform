const Payload = require('./payload.class.js');
const { PayloadModel } = require('../models');
class Uplink extends Payload {
  constructor(id, message, timestamp, ci, data, command, info){
    super(id, message, timestamp, ci, 'uplink', command);
    this.data = data;
    this.f_cnt = info.f_cnt;
    this.f_port = info.f_port;
    this.frm_payload = info.frm_payload;
    this.gw_id = info.gw_id;
    this.rssi = info.rssi;
    this.snr = info.snr;
    this.channel_index = info.channel_index;
    this.channel_rssi = info.channel_rssi;
    this.spreading_factor = info.spreading_factor;
    this.bandwidth = info.bandwidth;
    this.data_rate_index = info.data_rate_index;
    this.coding_rate = info.coding_rate;
    this.frequency = info.frequency;
    this.toa = info.toa;
  }

  static async generate (params) {
    params.ci_id = params.ci.id;
    let payloadModel = await PayloadModel.createPayload(new PayloadModel(params));
    const {id, message, timestamp, payload_id, type, command} = payloadModel;
    const {data, f_cnt, f_port, frm_payload, gw_id, rssi, snr} = payloadModel;
    const {channel_index, channel_rssi, spreading_factor, bandwidth, data_rate_index, coding_rate, frequency, toa} = payloadModel;
    const info = {
      data : data,
      f_cnt :f_cnt,
      f_port :f_port,
      frm_payload :frm_payload,
      gw_id :gw_id,
      rssi :rssi,
      snr :snr,
      channel_index :channel_index,
      channel_rssi :channel_rssi,
      spreading_factor :spreading_factor,
      bandwidth :bandwidth,
      data_rate_index :data_rate_index,
      coding_rate :coding_rate,
      frequency :frequency,
      toa :toa
    }
    return new Uplink(id, message, timestamp, params.ci, data, command, info);
  }

  static async find (query) {
    let payloadModels = await PayloadModel.readPayloads(query, {}, 0, 1000);
    return Object.values(payloadModels).map((payloadModel) => {
      const {id, message, timestamp, ci_id, payload_id, type, command} = payloadModel;
      const {data, f_cnt, f_port, frm_payload, gw_id, rssi, snr} = payloadModel;
      const {channel_index, channel_rssi, spreading_factor, bandwidth, data_rate_index, coding_rate, frequency, toa} = payloadModel;
      const info = {
        data : data,
        f_cnt :f_cnt,
        f_port :f_port,
        frm_payload :frm_payload,
        gw_id :gw_id,
        rssi :rssi,
        snr :snr,
        channel_index :channel_index,
        channel_rssi :channel_rssi,
        spreading_factor :spreading_factor,
        bandwidth :bandwidth,
        data_rate_index :data_rate_index,
        coding_rate :coding_rate,
        frequency :frequency,
        toa :toa
      }
      return new Uplink(id, message, timestamp, ci_id, data, command, info);
    })
  }

};
module.exports = Uplink;
