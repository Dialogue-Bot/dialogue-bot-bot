const { translate } = require('../services/translate');
const { replaceData } = require('./utils');

module.exports = class Cards {
  constructor(cards, currentLanguage, conversationData) {
    const { channelId, variables, language } = conversationData;
    this.channelId = channelId;
    this.cardsData = this.parseCards(cards);
    this.currentLanguage = currentLanguage;
    this.variables = variables;
    this.defaultLanguage = language;
    this.replaceCardsData();
  }

  parseCards(cards) {
    try {
      if (!cards) throw new Error('Cards is empty!');

      let result = typeof cards === 'string' ? JSON.parse(cards) : cards;

      if (typeof result === 'object' && !Array.isArray(result)) {
        result = [result];
      }

      if (!Array.isArray(result) || !result.length)
        throw new Error(`Cards must be an array or cards is empty!`);

      return result;
    } catch (e) {
      console.log(`[parseCards] parse cards failed: ${e.message}`);
      return;
    }
  }

  replaceCardsData() {
    if (!this.cardsData) return;
    try {
      this.cardsData = this.cardsData.map((card) => {
        let { title, imageUrl, subtitle, buttons } = card;

        const newData = {
          title: replaceData({ text: title, data: this.variables }),
          imageUrl: replaceData({ text: imageUrl, data: this.variables }),
          subtitle: replaceData({ text: subtitle, data: this.variables }),
        };

        if (!Array.isArray(buttons) || !buttons.length) return { ...newData };

        return {
          ...newData,
          buttons:
            Array.isArray(buttons) &&
            buttons.length &&
            buttons.map((button) => {
              return {
                ...button,
                label: replaceData({
                  text: button.label,
                  data: this.variables,
                }),
              };
            }),
        };
      });
    } catch (e) {
      console.log(`[replaceCardsData] replace data failed: ${e.message}`);
      return;
    }
  }

  async formatCards() {
    let results = [];
    try {
      switch (this.channelId) {
        case 'WEB':
        case 'MSG':
          results = await this.formatWebMsg();
          break;
        case 'LIN':
          results = await this.formatLINE();
          break;
        default:
          break;
      }
    } catch (err) {
      console.log('[formatCards] format failed: ' + err.message || err);
    }
    return results;
  }

  async formatWebMsg() {
    let result = [];
    if (!Array.isArray(this.cardsData) || !this.cardsData.length) return result;

    for (const data of this.cardsData) {
      try {
        let { title, subtitle, imageUrl, buttons } = data;

        if (!title || !imageUrl || !subtitle)
          throw new Error('Missing parameter');

        subtitle =
          this.currentLanguage !== this.defaultLanguage
            ? await translate(subtitle, this.currentLanguage, this.defaultLanguage)
            : subtitle;

        const card = {
          title: title.slice(0, 80),
          image_url: imageUrl,
          subtitle: subtitle.slice(0, 80),
        };

        buttons = await this.formatWebMsgButtons(buttons);
        if (buttons.length) card.buttons = buttons;
        result.push(card);
      } catch (error) {
        console.log(
          '[formatWebMsg] format card messenger or web failed: ' + error.message
        );
      }
    }
    return result.slice(0, 10);
  }

  async formatWebMsgButtons(buttons) {
    let result = [];
    if (!Array.isArray(buttons) || !buttons.length) return result;

    for (const button of buttons) {
      try {
        const { value, type, label } = button;

        if (!value || !type || !label) throw new Error('Missing parameter');

        const translateLabel =
          this.currentLanguage !== this.defaultLanguage
            ? await translate(label, this.currentLanguage, this.defaultLanguage).slice(0, 20)
            : label.slice(0, 20);

        switch (type) {
          case 'url':
            result.push({
              type: 'web_url',
              url: value,
              title: translateLabel,
            });
            break;
          case 'postback':
            result.push({
              type: 'postback',
              payload: value.slice(0, 1000),
              title: translateLabel,
            });
            break;
          default:
            break;
        }
      } catch (error) {
        console.log('[formatWebMsgButtons] format failed: ' + error.message);
      }
    }

    return result.slice(0, 3);
  }

  async formatLINE() {
    let result = [];
    if (!Array.isArray(this.cardsData) || !this.cardsData.length) return result;

    for (let data of cards) {
      try {
        let { title, subtitle, imageUrl, buttons } = data;

        if (!title || !imageUrl || !subtitle)
          throw new Error('Missing parameter');

        subtitle =
          this.currentLanguage !== this.defaultLanguage
            ? await translate(subtitle, this.currentLanguage, this.defaultLanguage)
            : subtitle;

        const card = {
          title: title.slice(0, 40),
          thumbnailImageUrl: imageUrl,
          text: subtitle.slice(0, 60),
        };

        buttons = await this.formatLINEButtons(buttons);
        if (buttons.length) card.actions = buttons;

        result.push(card);
      } catch (error) {
        console.log('[formatLINE] format cards failed: ' + error.message);
      }
    }
    return result.slice(0, 10);
  }

  async formatLINEButtons(buttons) {
    let result = [];
    if (!Array.isArray(buttons) || !buttons.length) return result;

    for (let button of buttons) {
      try {
        const { value, type, label } = button;

        if (!value || !type || !label) throw new Error('Missing parameter');

        const translateLabel =
          this.currentLanguage !== this.defaultLanguage
            ? await translate(label, this.currentLanguage, this.defaultLanguage).slice(0, 20)
            : label.slice(0, 20);

        switch (type) {
          case 'url':
            result.push({
              type: 'uri',
              uri: value,
              label: translateLabel,
            });
            break;
          case 'postback':
            result.push({
              type: 'postback',
              data: value,
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

    return result.slice(0, 3);
  }
};
