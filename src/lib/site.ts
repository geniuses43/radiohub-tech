export const SITE_URL = 'https://radiohub.tech';
export const SITE_NAME = 'РадиоХаб';

export const ANDROID_PACKAGE = 'com.radiohub';
export const IOS_APP_ID = '6761184795';

export const STORE = {
  appStore: `https://apps.apple.com/ru/app/id${IOS_APP_ID}`,
  googlePlay: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
  ruStore: `https://www.rustore.ru/catalog/app/${ANDROID_PACKAGE}`,
};

/** Ссылка в магазин с метками, чтобы переходы с сайта были видны в аналитике */
export const withUtm = (url: string, medium: string) =>
  `${url}${url.includes('?') ? '&' : '?'}utm_source=radiohub.tech&utm_medium=${medium}&utm_campaign=web2app`;

/**
 * Android: intent:// на тот же адрес сайта. Пока приложение не принимает ссылки,
 * Chrome уходит на fallback (Google Play). Когда в приложении появятся App Links
 * (ФТ «Открытие по ссылкам»), та же кнопка начнёт открывать нужную станцию.
 */
export function androidIntent(path: string, medium = 'smart_banner') {
  const fallback = withUtm(STORE.googlePlay, medium);
  return `intent://radiohub.tech${path}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}

export const absUrl = (p: string) => SITE_URL + p;
