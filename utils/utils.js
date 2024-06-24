const { translate } = require('../services/translate');
const endConversation = async (step, message) => {
  if (message) await step.context.sendActivity(message);
  if (step.parent && typeof step.parent.cancelAllDialogs == 'function')
    await step.parent.cancelAllDialogs();
  if (typeof step.cancelAllDialogs == 'function') await step.cancelAllDialogs();

  return await step.endDialog();
};

const replaceData = ({ text, data }) => {
  if (!data || !text) return text;

  try {
    text = text.replace(
      /{([a-zA-Z0-9_ ]+(?:->[a-zA-Z0-9_ ]+)*)}/g,
      (match, key) => {
        const keys = key.split('->');
        let value =
          data.find((item) => item.name === keys[0]).value || undefined;

        if (keys.length === 1) return value;

        return (
          keys
            .slice(1)
            .reduce(
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
        console.error('Invalid expression:', expression);
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

const getPrompt = (contents, language, error) => {
  let result = { message: '', language: 'en', type: 'text' };

  let data = detectContentsLanguage(contents, language);

  if (data) {
    result.message = error ? data.repeatMessage : data.message || data.url;
    result.language = data.language;
    result.type = data.type;
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

  language = ['en', 'vi'].find((x) => x !== language);

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
  let result = { data: '', language: 'en' };

  if (!['LIN', 'WEB', 'MSG'].includes(channelId)) {
    console.log(
      '[getExtendTypeMessage] Bot does not support channel ' + channelId
    );
    return;
  }

  contents = detectContentsLanguage(contents, language);

  if (contents && contents.buttons && contents.buttons.length) {
    const quickReplyData = await formatQuickReply(
      channelId,
      contents.buttons,
      contents.language,
      language
    );
    result = {
      data: quickReplyData,
      type: 'list-button',
    };
  }
  if (contents && contents.cards && contents.cards.length) {
    const cardsData =
      channelId === 'LIN'
        ? await formatLINECards(contents.cards, contents.language, language)
        : (await formatCards(contents.cards, contents.language, language)) ||
          [];
    result = {
      data: cardsData,
      type: 'list-card',
    };
  }

  return result;
};

const formatQuickReply = async (
  channelId,
  buttons,
  currentLanguage,
  defaultLanguage
) => {
  let result = [];
  switch (channelId) {
    case 'LIN':
      result = formatQuickReplyLIN(buttons, currentLanguage, defaultLanguage);
      break;
    case 'MSG':
      result = await formatQuickReplyMSG(
        buttons,
        currentLanguage,
        defaultLanguage
      );
      break;
    case 'WEB':
      result = await formatButtons(buttons, currentLanguage, defaultLanguage);
    default:
      break;
  }
  return result;
};

const formatQuickReplyMSG = async (
  buttons,
  currentLanguage,
  defaultLanguage
) => {
  let result = [];
  for (let button of buttons) {
    try {
      const translateLabel =
        currentLanguage !== defaultLanguage
          ? await translate(button.label, currentLanguage, defaultLanguage)
          : button.label;
      if (button.type !== 'postback') return;
      result.push({
        content_type: 'text',
        payload: button.value,
        title: translateLabel,
      });
    } catch (error) {
      console.log('[formatQuickReplyMSG] format failed: ' + error.message);
    }
  }
  return result;
};

const formatQuickReplyLIN = async (
  buttons,
  currentLanguage,
  defaultLanguage
) => {
  let result = [];
  for (let button of buttons) {
    try {
      const translateLabel =
        currentLanguage !== defaultLanguage
          ? await translate(button.label, currentLanguage, defaultLanguage)
          : button.label;
      if (button.type !== 'postback') return;
      result.push({
        type: 'action',
        action: {
          type: 'message',
          label: translateLabel,
          text: button.value,
        },
      });
    } catch (error) {
      console.log('[formatQuickReplyLIN] format failed: ' + error.message);
    }
  }
  return result;
};

const formatCards = async (cards, currentLanguage, defaultLanguage) => {
  let result = [];
  if (!Array.isArray(cards)) return result;

  for (const data of cards) {
    try {
      const card = {
        title: data.title,
        image_url: data.imageUrl,
        subtitle:
          currentLanguage !== defaultLanguage
            ? await translate(data.subtitle, currentLanguage, defaultLanguage)
            : data.subtitle,
      };
      const buttons =
        data.buttons &&
        (await formatButtons(data.buttons, currentLanguage, defaultLanguage));
      if (buttons.length) card.buttons = buttons;
      result.push(card);
    } catch (error) {
      console.log('[formatCards] format failed: ' + error.message);
    }
  }
  return result;
};

const formatButtons = async (buttons, currentLanguage, defaultLanguage) => {
  let result = [];
  if (!Array.isArray(buttons)) return result;

  for (const button of buttons) {
    try {
      const translateLabel =
        currentLanguage !== defaultLanguage
          ? await translate(button.label, currentLanguage, defaultLanguage)
          : button.label;
      switch (button.type) {
        case 'url':
          result.push({
            type: 'web_url',
            url: button.value,
            title: translateLabel,
          });
          break;
        case 'postback':
          result.push({
            type: 'postback',
            payload: button.value,
            title: translateLabel,
          });
          break;
        default:
          break;
      }
    } catch (error) {
      console.log('[formatButtons] format failed: ' + error.message);
    }
  }

  return result;
};

const formatLINEButtons = async (buttons, currentLanguage, defaultLanguage) => {
  let result = [];
  if (!Array.isArray(buttons)) return result;

  for (let button of buttons) {
    try {
      const translateLabel =
        currentLanguage !== defaultLanguage
          ? await translate(button.label, currentLanguage, defaultLanguage)
          : button.label;
      switch (button.type) {
        case 'url':
          result.push({
            type: 'uri',
            uri: button.value,
            label: translateLabel,
          });
          break;
        case 'postback':
          result.push({
            type: 'postback',
            data: button.value,
            label: translateLabel,
            displayText: translateLabel,
          });
          break;
        default:
          break;
      }
    } catch (error) {
      console.log('[formatLINEButtons] format failed: ' + error.message);
    }
  }

  return result;
};

const formatLINECards = async (cards, currentLanguage, defaultLanguage) => {
  let result = [];
  if (!Array.isArray(cards)) return result;

  for (let data of cards) {
    try {
      const card = {
        title: data.title,
        thumbnailImageUrl: data.imageUrl,
        text:
          currentLanguage !== defaultLanguage
            ? await translate(data.subtitle, currentLanguage, defaultLanguage)
            : data.subtitle,
      };
      const buttons = data.buttons && (await formatLINEButtons(data.buttons));
      if (buttons.length) card.actions = buttons;
      result.push(card);
    } catch (error) {
      console.log('[formatLINECards] format failed: ' + error.message);
    }
  }
  return result;
};

const accessProp = (path, object) => {
  return path.split('->').reduce((o, i) => o[i], object);
};

const replaceObjWithParam = (conversationData, obj) => {
  if (!conversationData || !obj) return {};

  const arr = Object.keys(obj);

  try {
    for (let key of arr) {
      if (
        obj[key] &&
        typeof obj[key] == 'string' &&
        obj[key].match(/^{[\w->]+}$/)
      ) {
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

const formatMessage = ({ data, type, conversationData }) => {
  if (!conversationData) return;

  if (!type) return { type: 'message', text: '', channelData: {} };

  return type === 'text'
    ? { type: 'message', text: data, channelData: {} }
    : { type: 'image', text: '', channelData: { imageUrl: data } };
};

const keyValueToObject = (data) => {
  if (!data || !!data) return {};
  let result = {};
  try {
    const temp = JSON.parse(data);

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

const arrayKeyValueToObject = (array) => {
  if (!Array.isArray(array) || !array.length) return {};
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
};

const replaceSubFlowValueAssigned = (variables, subFlowOutput) => {
  try {
    subFlowOutput.forEach((s) => {
      const value =
        variables.find((v) => v.name === s.outputVar)?.value || null;
      let findVar = variables.find((v) => v.name === s.assignTo);

      if (value && findVar) {
        findVar.value = value;
      }

      // remove subflow var in conversationData variables
      variables = variables.filter((v) => v.name !== s.outputVar);
    });
  } catch (e) {
    console.log(
      '[replaceSubFlowValueAssigned] Can not assign value of variables in subflow to mainflow ' +
        e.message
    );
  }

  return variables;
};

module.exports = {
  endConversation,
  getPrompt,
  getExtendTypeMessage,
  replaceData,
  replaceObjWithParam,
  formatMessage,
  keyValueToObject,
  arrayKeyValueToObject,
  replaceSubFlowValueAssigned,
};
