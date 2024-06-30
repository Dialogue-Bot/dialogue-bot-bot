const { default: axios } = require('axios');

const translate = async (text, fromLang = 'auto', toLang = 'en') => {
  if (!text || fromLang == toLang) return replaceTextInside(text);

  try {
    let config = {
      method: 'get',
      url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURI(
        text
      )}`,
    };

    console.log('[translate] - ' + JSON.stringify(config));

    const { data } = await axios(config);

    if (!data) {
      throw new Error('Can not translate text');
    }

    const filterTranslateValue = replaceTextInside(data[0].map(d => d[0]).join('') || data[0][0][0]);

    console.log(
      `Translated: ${fromLang} -> ${toLang} | ${text} -> ${filterTranslateValue}`
    );

    return filterTranslateValue;
  } catch (error) {
    console.log('Translate filed - ', error.message);
    console.log(error.response && error.response.data);
    console.error(error.stack);
    return text;
  }
};

const replaceTextInside = (text) => {
  return typeof text === 'string' ? text.replace(/\\\|/g, '') : text;
}

module.exports = { translate };
