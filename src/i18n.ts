import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import taTranslation from './locales/ta.json';
import teTranslation from './locales/te.json';
import hiTranslation from './locales/hi.json';
import knTranslation from './locales/kn.json';
import mlTranslation from './locales/ml.json';

const resources = {
  en: { translation: enTranslation },
  ta: { translation: taTranslation },
  te: { translation: teTranslation },
  hi: { translation: hiTranslation },
  kn: { translation: knTranslation },
  ml: { translation: mlTranslation },
};

const savedLanguage = localStorage.getItem('energyGuardLanguage') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage, // use persisted language or default
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('energyGuardLanguage', lng);
});

export default i18n;
