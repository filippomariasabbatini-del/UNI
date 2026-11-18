/*
 * Read motion tokens from the CSS custom properties defined in styles/tokens.css,
 * so JS-driven animations use the same curves as CSS. Fallbacks only cover a
 * stylesheet that failed to load.
 */
const css = () => getComputedStyle(document.documentElement);
export const token = (name, fallback) => css().getPropertyValue(`--${name}`).trim() || fallback;
export const easing = () => ({
  inst: token('ease-institutional', 'cubic-bezier(0.22, 1, 0.36, 1)'),
  focus: token('ease-focus', 'cubic-bezier(0.33, 1, 0.68, 1)'),
  strike: token('ease-strike', 'cubic-bezier(0.55, 0, 1, 0.45)'),
  fade: token('ease-fade', 'cubic-bezier(0.45, 0, 0.55, 1)'),
});
