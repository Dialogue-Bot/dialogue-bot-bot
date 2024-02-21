const axios = require('axios');

const { PROXY_DOMAIN } = process.env;

const getFlowByChannelId = async (channelId) => {
  try {
    const { data } = await axios({
      method: 'GET',
      url: PROXY_DOMAIN + '/bot/flow/' + channelId,
    });

    return data;
  } catch (e) {
    console.log(`Can not get flow!`, e.message);
  }
};

const getFlowById = async (id) => {
  try {
    const { data } = await axios({
      method: 'GET',
      url: PROXY_DOMAIN + '/bot/flow/id/' + id,
    });

    if (data) {
      return data.data;
    }
  } catch (e) {
    console.log(`Can not get flow!`, e.message);
  }
};

module.exports = {
  getFlowByChannelId,
  getFlowById,
};
