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

    console.log('[translate] - ' + JSON.stringify(config));

    const { data } = await axios(config);

    if (!data) {
      throw new Error('Can not translate text');
    }

    const filterTranslateValue = data[0].map(d => d[0]).join('') || data[0][0][0];

    const replaceInside = filterTranslateValue.replace(/\\\|/g, '');

    console.log(
      `Translated: ${fromLang} -> ${toLang} | ${text} -> ${replaceInside}`
    );

    return replaceInside;
  } catch (error) {
    console.log('Translate filed - ', error.message);
    console.log(error.response && error.response.data);
    console.error(error.stack);
    return text;
  }
};

module.exports = { translate };
