const axios = require("axios");

const { PROXY_DOMAIN, API_TOKEN } = process.env;

const getFlowByContactId = async (contactId, testBot) => {
  try {
    const config = {
      method: "GET",
      url: PROXY_DOMAIN + "/flow/" + contactId,
      data: { isTest: testBot ?? false },
      headers: {
        'Authorization': API_TOKEN
      }
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
      headers: {
        'Authorization': API_TOKEN
      }
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
      headers: {
        'Authorization': API_TOKEN
      }
    };

    const { data } = await axios(config);

    if(data) return true
  } catch (e) {
    console.log(`Can not send mail!`, e.message);
  }
  return false;
};

module.exports = {
  getFlowByContactId,
  getFlowById,
  botSendMail,
};
