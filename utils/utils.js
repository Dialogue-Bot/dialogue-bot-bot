const { translate } = require('../services/translate');
const endConversation = async (step, message) => {
  if (message) await step.context.sendActivity(message);
  if (step.parent && typeof step.parent.cancelAllDialogs == "function")
    await step.parent.cancelAllDialogs();
  if (typeof step.cancelAllDialogs == "function") await step.cancelAllDialogs();

  return await step.endDialog();
};

const replaceData = ({ text, data }) => {
  if (!data || !text) return text;

  try {
    text = text.replace(
      /{([a-zA-Z0-9_ ]+(?:->[a-zA-Z0-9_ ]+)*)}/g,
      (match, key) => {
        const keys = key.split("->");
        let value = data.find((item) => item.name === keys[0]).value || undefined;

        if(keys.length === 1) return value;

        return (
          keys.slice(1).reduce(
              (acc, curr) => (value ? (value = value[curr]) : undefined),
              value
            ) || undefined
        );
      }
    );

    text = text.replace(/{cal\((.*?)\)}/g, (match, expression) => {
      try {
        const result = eval(expression);
        return result;
      } catch (error) {
        console.error("Invalid expression:", expression);
        return match; // Return the original placeholder if there's an error in the expression
      }
    });

    if (/{([a-zA-Z0-9_ ]+(?:->[a-zA-Z0-9_ ]+)*)}/g.test(text))
      return replaceData({ text, data });
    return text;
  } catch (e) {
    console.log(e);
  }

  return text;
};

const getTranslatedMessage = (contents, language, error) => {
  let result = { message: "", language: "en", type: "text" };

  let data = detectContentsLanguage(contents, language);

  if (data) {
    result.message = error ? data.repeatMessage : data.message;
    result.language = data.language;
  }

  return result;
};

const detectContentsLanguage = (contents, language) => {

  if (contents[language]) {
    return {
      ...contents[language],
      language,
    };
  }

  language = ["en", "vi"].find((x) => x !== language);
  
  if (contents[language]) {
    return {
      ...contents[language],
      language,
    };
  }

  return null;
  // return contents[language] ?? (contents[arrLang.find((x) => x !== language)] ?? null);
};

const getExtendTypeMessage = async (contents, language, channelId) => {
  if (!Object.keys(contents).length) return;
  let result = { data: "", language: "en" };

  if (!["LIN", "WEB", "MSG"].includes(channelId)) {
    console.log(
      "[getExtendTypeMessage] Bot does not support channel " + channelId
    );
    return;
  }

  contents = detectContentsLanguage(contents, language);

  if (contents && contents.buttons && contents.buttons.length) {
    result = {
      data:
        channelId === "LIN"
          ? formatLINEButtons(contents.buttons, contents.language, language)
          : await formatButtons(contents.buttons, contents.language, language) || [],
      type: "list-button",
    };
  }
  if (contents && contents.cards && contents.cards.length) {
    result = {
      data:
        channelId === "LIN"
          ? formatLINECards(contents.cards, contents.language, language)
          : await formatCards(contents.cards, contents.language, language) || [],
      type: "list-card",
    };
  }

  return result;
};

const formatCards = async (cards, currentLanguage, defaultLanguage) => {
  let result = [];
  if (!Array.isArray(cards)) return result;

  for (const data of cards){
    const card = {
      title: data.title,
      image_url: data.imageUrl,
      subtitle: (currentLanguage !== defaultLanguage) ? await translate(data.subtitle, currentLanguage, defaultLanguage) : data.subtitle,
    };
    const buttons = data.buttons && await formatButtons(data.buttons, currentLanguage, defaultLanguage);
    if (buttons.length) card.buttons = buttons;
    result.push(card);
  };
  return result;
};

const formatButtons = async (buttons, currentLanguage, defaultLanguage) => {
  let result = [];
  if (!Array.isArray(buttons)) return result;

  for (const button of buttons){
    const translateLabel = (currentLanguage !== defaultLanguage) ? await translate(button.label, currentLanguage, defaultLanguage) : button.label;
    switch (button.type) {
      case "url":
        result.push({ type: "web_url", url: button.value, title: translateLabel });
        break;
      case "postback":
        result.push({ type: "postback", payload: button.value, title: translateLabel });
        break;
      default:
        break;
    }
  };

  return result;
};

const formatLINEButtons = (buttons, currentLanguage, defaultLanguage) => {
  let result = [];
  if (!Array.isArray(buttons)) return result;

  buttons.forEach((b) => {
    switch (b.type) {
      case "url":
        result.push({ type: "uri", uri: b.value, label: b.label });
        break;
      case "postback":
        result.push({ type: "postback", data: b.value, label: b.label });
        break;
      default:
        break;
    }
  });

  return result;
};

const formatLINECards = (cards, currentLanguage, defaultLanguage) => {
  let result = [];
  if (!Array.isArray(cards)) return result;

  cards.forEach((d) => {
    const card = {
      title: d.title,
      thumbnailImageUrl: d.imageUrl,
      text: d.subtitle,
    };
    const buttons = d.buttons && formatLINEButtons(d.buttons);
    if (buttons.length) card.actions = buttons;
    result.push(card);
  });
  return result;
};

const accessProp = (path, object) => {
  return path.split("->").reduce((o, i) => o[i], object);
};

const replaceObjWithParam = (conversationData, obj) => {
  if (!conversationData || !obj) return {};

  const arr = Object.keys(obj);

  try {
    for (let key of arr) {
      if (
        obj[key] &&
        typeof obj[key] == "string" &&
        obj[key].match(/^{[\w->]+}$/)
      ) {
        obj[key] = accessProp(obj[key].replace(/{|}/g, ""), conversationData);
      } else if (obj[key] && typeof obj[key] == "string") {
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
    type: "template",
    channelData: { type },
  };

  let data = [];

  if (!Array.isArray(extend)) return console.log(`Invalid format`);

  for (let tp of extend) {
    let rs = replaceObjWithParam(conversationData.variables, tp);

    let { buttons } = tp;

    rs.buttons = buttons.map((b) =>
      replaceObjWithParam(conversationData.variables, b)
    );

    data.push(rs);
  }

  result.channelData.extend = data;

  return result;
};

const formatReceipt = ({ extend, conversationData }) => {
  if (!extend) return {};

  extend = replaceObjWithParam(conversationData.variables, extend);

  extend.address = replaceObjWithParam(
    conversationData.variables,
    extend.address
  );

  extend.elements =
    (extend.elements &&
      extend.elements.map((e) =>
        replaceObjWithParam(conversationData.variables, e)
      )) ||
    [];

  extend.summary = replaceObjWithParam(
    conversationData.variables,
    extend.summary
  );

  return { type: "receipt", channelData: { ...extend } };
};

const formatMessage = ({ text, type, extend, conversationData }) => {
  if (!conversationData) return;

  if (!type || type === "text") return { type: "message", text };

  switch (conversationData.channelId) {
    case "MSG":
      const template = {
        address_template: ({ text }) => {
          return { type: "address_template", text, channelData: { text } };
        },
        receipt: ({ conversationData, contents }) =>
          formatReceipt({ conversationData, contents }),
        template: ({ type, conversationData, contents }) =>
          formatMSGTemplate({ type, conversationData, contents }),
      };

      return template[type]({ conversationData, extend, text });

    // if (type == 'address_template') return { type: 'address_template', text, channelData: { type, text } };
    // if (type == 'receipt') return formatReceipt({ conversationData, extend });
    // return formatMSGTemplate({ type, conversationData, extend });
    default:
      break;
  }

  return { type: "message", text, channelData: { type, extend } };
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


const arrayKeyValueToObject = (array) =>{
  if(!Array.isArray(array) || !array.length) return {};
  let result = {};
  try {
    array.forEach((e) => {
      result[e.key] = e.value;
    });
  } catch (e) {
    console.log(`ArrayKeyValueToObject - Can not replace`);
    console.log(e.stack);
  }

  return result;
}

module.exports = {
  endConversation,
  getTranslatedMessage,
  getExtendTypeMessage,
  replaceData,
  replaceObjWithParam,
  formatMessage,
  keyValueToObject,
  arrayKeyValueToObject,
};
