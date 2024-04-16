const axios = require("axios");

const { PROXY_DOMAIN } = process.env;

const getFlowByChannelId = async (channelId, testBot) => {
  try {
    const config = {
      method: "GET",
      url: PROXY_DOMAIN + "/flow/" + channelId,
      data: { isTest: testBot ?? false },
    }
    const { data } = await axios(config);

    return data;
  } catch (e) {
    console.log(`Can not get flow!`, e.message);
  }
};

const getFlowById = async (id, testBot) => {
  try {
    const config = {
      method: "GET",
      url: PROXY_DOMAIN + "/bot/flow/" + id,
      data: { isTest: testBot ?? false },
    }

    const { data } = await axios(config);

    return data;
  } catch (e) {
    console.log(`Can not get flow!`, e.message);
  }
};

module.exports = {
  getFlowByChannelId,
  getFlowById,
};
