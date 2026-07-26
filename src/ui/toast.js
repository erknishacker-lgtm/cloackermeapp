/**
 * Wrapper fino do Sileo (toasts com fisica/spring).
 * https://github.com/hiaaryan/sileo
 */
import { sileo } from 'sileo';

const textStyles = {
  title: 'color:#ffffff',
  description: 'color:rgba(255,255,255,0.92)',
  badge: 'color:#ffffff',
  button: 'color:#0a0a0a;background:#ffffff'
};

const base = {
  fill: '#1a1a1a',
  roundness: 14,
  duration: 4200,
  styles: textStyles
};

export const toast = {
  success(title, description) {
    return sileo.success({ ...base, title, description, styles: textStyles });
  },
  error(title, description) {
    return sileo.error({ ...base, title, description, duration: 5600, styles: textStyles });
  },
  warning(title, description) {
    return sileo.warning({ ...base, title, description, styles: textStyles });
  },
  info(title, description) {
    return sileo.info({ ...base, title, description, styles: textStyles });
  },
  action(title, description, button) {
    return sileo.action({
      ...base,
      title,
      description,
      duration: 7000,
      button,
      styles: textStyles
    });
  },
  promise(promise, opts) {
    return sileo.promise(promise, opts);
  },
  dismiss: sileo.dismiss,
  clear: sileo.clear
};

export { sileo };
