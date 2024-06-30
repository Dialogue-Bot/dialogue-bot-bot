const { translate } = require('../services/translate');
const Cards = require('./cards');
const { replaceData } = require('./utils');

const formatMessage = ({ data, type, conversationData }) => {
  if (!conversationData) return;

  if (!type || !['text', 'image'].includes(type))
    return { type: 'message', text: '', channelData: {} };

  return type === 'text'
    ? { type: 'message', text: data, channelData: {} }
    : { type: 'image', text: '', channelData: { imageUrl: data } };
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

  return;
};

const getExtendTypeMessage = async (contents, conversationData) => {
  let result = { data: '', language: 'en' };
  try {
    if (!Object.keys(contents).length)
      throw new Error('Contents can not be empty');
    const { channelId, variables, language } = conversationData;

    if (!['LIN', 'WEB', 'MSG'].includes(channelId)) {
      throw new Error('Bot does not support channel ' + channelId);
    }

    contents = detectContentsLanguage(contents, language);

    if (contents.type === 'list-card') {
      const dynamicCardsValue =
        variables.find((v) => v.name === contents.dynamicCards) || {};
      const cardsData = dynamicCardsValue.value || contents.cards || [];

      const cards = new Cards(cardsData, contents.language, conversationData);

      const formatCards = await cards.formatCards();

      return {
        data: formatCards,
        type: 'list-card',
      };
    }

    if (contents && contents.buttons && contents.buttons.length) {
      const quickReplyData = await formatQuickReply(
        channelId,
        contents.buttons,
        variables,
        contents.language,
        language
      );
      return {
        data: quickReplyData,
        type: 'list-button',
      };
    }
  } catch (err) {
    console.log(
      '[getExtendTypeMessage] get extend type message failed: ' + err.message ||
        err
    );
  }

  return result;
};

const formatQuickReply = async (
  channelId,
  buttons,
  variables,
  currentLanguage,
  defaultLanguage
) => {
  let result = [];
  switch (channelId) {
    case 'LIN':
      result = await formatQuickReplyLIN(
        buttons,
        variables,
        currentLanguage,
        defaultLanguage
      );
      break;
    case 'MSG':
      result = await formatQuickReplyMSG(
        buttons,
        variables,
        currentLanguage,
        defaultLanguage
      );
      break;
    case 'WEB':
      result = await formatQuickReplyWEB(
        buttons,
        variables,
        currentLanguage,
        defaultLanguage
      );
    default:
      break;
  }
  return result;
};

const formatQuickReplyMSG = async (
  buttons,
  variables,
  currentLanguage,
  defaultLanguage
) => {
  let result = [];
  for (let button of buttons) {
    try {
      button.label = replaceData({text: button.label, data: variables})
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
  return result.slice(0, 13);
};

const formatQuickReplyLIN = async (
  buttons,
  variables,
  currentLanguage,
  defaultLanguage
) => {
  let result = [];
  for (let button of buttons) {
    try {
      button.label = replaceData({text: button.label, data: variables})
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
  return result.slice(0, 13);
};

const formatQuickReplyWEB = async (
  buttons,
  variables,
  currentLanguage,
  defaultLanguage
) => {
  let result = [];
  if (!Array.isArray(buttons)) return result;

  for (let button of buttons) {
    try {
      button.label = replaceData({text: button.label, data: variables})
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

module.exports = {
  getPrompt,
  getExtendTypeMessage,
  formatMessage,
};
