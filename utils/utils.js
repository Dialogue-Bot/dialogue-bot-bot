const endConversation = async (step, message) => {
  if (message) await step.context.sendActivity(message);
  if (step.parent && typeof step.parent.cancelAllDialogs == 'function') await step.parent.cancelAllDialogs();
  if (typeof step.cancelAllDialogs == 'function') await step.cancelAllDialogs();

  return await step.endDialog();
};

const replaceData = ({ text, data }) => {
  if (!data || !text) return text;

  try {
    text = text.replace(/{([a-zA-Z0-9_ ]+(?:->[a-zA-Z0-9_ ]+)*)}/g, (match, key) => {
      return key.split('->').reduce((o, i) => o[i], data);
    });

    text = text.replace(/{cal\((.*?)\)}/g, (match, expression) => {
      try {
        const result = eval(expression);
        return result;
      } catch (error) {
        console.error('Invalid expression:', expression);
        return match; // Return the original placeholder if there's an error in the expression
      }
    });

    if (/{([a-zA-Z0-9_ ]+(?:->[a-zA-Z0-9_ ]+)*)}/g.test(text)) return replaceData({ text, data });
  } catch (e) {
    console.log(e);
  }

  return text;
};

const getTranslatedMessage = (arr, language) => {
  let result = { message: '', language: 'en' };

  if (!Array.isArray(arr)) return result;

  result = arr.find((t) => t.language == language);

  return result || arr.find((t) => t.language, 'en') || { message: '', language: 'en' };
};

const accessProp = (path, object) => {
  return path.split('->').reduce((o, i) => o[i], object);
};

const replaceObjWithParam = (conversationData, obj) => {
  if (!conversationData || !obj) return {};

  const arr = Object.keys(obj);

  try {
    for (let key of arr) {
      if (obj[key] && typeof obj[key] == 'string' && obj[key].match(/^{[\w->]+}$/)) {
        obj[key] = accessProp(obj[key].replace(/{|}/g, ''), conversationData);
      } else if (obj[key] && typeof obj[key] == 'string') {
        obj[key] = replaceData({ text: obj[key], data: conversationData });
      }
    }
  } catch (e) {
    return {};
  }

  return obj;
};

const formatMSGTemplate = ({ type, conversationData, extend }) => {
  let result = {
    type: 'template',
    channelData: { type },
  };

  let data = [];

  if (!Array.isArray(extend)) return console.log(`Invalid format`);

  for (let tp of extend) {
    let rs = replaceObjWithParam(conversationData.data, tp);

    let { buttons } = tp;

    rs.buttons = buttons.map((b) => replaceObjWithParam(conversationData.data, b));

    data.push(rs);
  }

  result.channelData.extend = data;

  return result;
};

const formatReceipt = ({ extend, conversationData }) => {
  if (!extend) return {};

  extend = replaceObjWithParam(conversationData.data, extend);

  extend.address = replaceObjWithParam(conversationData.data, extend.address);

  extend.elements = (extend.elements && extend.elements.map((e) => replaceObjWithParam(conversationData.data, e))) || [];

  extend.summary = replaceObjWithParam(conversationData.data, extend.summary);

  return { type: 'receipt', channelData: { ...extend } };
};

const formatMessage = ({ text, type, extend, conversationData }) => {
  if (!conversationData) return;

  if (!type || type == 'normal') return { type: 'message', text };

  switch (conversationData.channelId) {
    case 'MSG':
      const template = {
        address_template: ({ text }) => {
          return { type: 'address_template', text, channelData: { text } };
        },
        receipt: ({ conversationData, extend }) => formatReceipt({ conversationData, extend }),
        template: ({ type, conversationData, extend }) => formatMSGTemplate({ type, conversationData, extend }),
      };

      return template[type]({ conversationData, extend, text });

    // if (type == 'address_template') return { type: 'address_template', text, channelData: { type, text } };
    // if (type == 'receipt') return formatReceipt({ conversationData, extend });
    // return formatMSGTemplate({ type, conversationData, extend });
    default:
      break;
  }

  return { type: 'message', text, channelData: { type, extend } };
};

const keyValueToObject = (string) => {
  if (!string) return {};
  let result = {};
  try {
    const temp = JSON.parse(string);

    if (!Array.isArray(temp)) return {};

    temp.forEach((e) => {
      result[e.label] = e.value;
    });
  } catch (e) {
    console.log(`keyValueToObject - Can not parse string`);
    console.log(e.stack);
  }

  return result;
};

module.exports = {
  endConversation,
  getTranslatedMessage,
  replaceData,
  replaceObjWithParam,
  formatMessage,
  keyValueToObject,
};
