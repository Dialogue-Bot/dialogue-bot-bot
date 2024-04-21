const axios = require("axios");

const { PROXY_DOMAIN } = process.env;

const getFlowByChannelId = async (channelId, testBot) => {
  try {
    const config = {
      method: "GET",
      url: PROXY_DOMAIN + "/flow/" + channelId,
      data: { isTest: testBot ?? false },
    };
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
    };

    const { data } = await axios(config);

    return data;
  } catch (e) {
    console.log(`Can not get flow!`, e.message);
  }
};

const botSendMail = async (to, subject, template, contactId) => {
  try {
    const config = {
      method: "POST",
      url: PROXY_DOMAIN + "/bot-mail/send",
      data: {
        from: '2051120245@ut.edu.vn',
        to,
        subject,
        contactId,
        template,
      },
    };

    const { data } = await axios(config);

    if(data) return true
  } catch (e) {
    console.log(`Can not send mail!`, e.message);
  }
  return false;
};

module.exports = {
  getFlowByChannelId,
  getFlowById,
  botSendMail,
};
