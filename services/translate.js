const { default: axios } = require('axios');

const translate = async (text, fromLang = 'auto', toLang = 'en') => {
  if (!text || fromLang == toLang) return text;

  try {
    let config = {
      method: 'get',
      url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURI(
        text
      )}`,
    };

    console.log(config);

    const { data } = await axios(config);

    if (!data) {
      throw new Error('Can not translate text');
    }

    console.log(`[freeTranslate] Translated: ${JSON.stringify(data)}`);
    return data[0][0][0];
  } catch (error) {
    console.log('[freeTranslate] err:', error.message);
    console.log(error.response && error.response.data);
    console.error(error.stack);
    return text;
  }
};

module.exports = { translate };
