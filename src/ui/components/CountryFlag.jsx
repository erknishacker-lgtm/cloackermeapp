/**
 * Bandeiras via flagcdn (publico/gratis).
 * Padrao visual proximo a flag-icons do Untitled UI.
 */
export function CountryFlag({ code, size = 18, className = '' }) {
  const c = String(code || '')
    .trim()
    .toLowerCase();
  if (!/^[a-z]{2}$/.test(c) || c === 'xx' || c === 't1') {
    return <span className={`country-flag-fallback ${className}`}>—</span>;
  }
  const px = Math.max(16, Math.round(size * 1.4));
  return (
    <img
      className={`country-flag-img ${className}`}
      src={`https://flagcdn.com/w${px}/${c}.png`}
      srcSet={`https://flagcdn.com/w${px * 2}/${c}.png 2x`}
      width={Math.round(size * 1.4)}
      height={size}
      alt={c.toUpperCase()}
      loading="lazy"
      decoding="async"
    />
  );
}

export function countryFlagEmoji(code) {
  const c = String(code || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '';
  const base = 127397;
  return String.fromCodePoint(base + c.charCodeAt(0), base + c.charCodeAt(1));
}
