export const APP_NAME = 'Draft Day';
export const APP_TAGLINE = 'Salary-cap head-to-head fantasy cricket';

export function pageTitle(pageName) {
  return pageName ? `${pageName} | ${APP_NAME}` : APP_NAME;
}
