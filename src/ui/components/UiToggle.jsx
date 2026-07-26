/**
 * Toggle no estilo Untitled UI (sm/md) — sem dependencias externas.
 * Ref: untitleduico/react components/base/toggle
 */
export function UiToggle({
  checked = false,
  onChange,
  label,
  hint,
  size = 'sm',
  disabled = false,
  className = '',
  id
}) {
  const inputId = id || undefined;

  return (
    <label
      className={[
        'ui-toggle',
        `ui-toggle-${size}`,
        checked ? 'is-on' : '',
        disabled ? 'is-disabled' : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="ui-toggle-input"
      />
      <span className="ui-toggle-track" aria-hidden>
        <span className="ui-toggle-thumb" />
      </span>
      {label || hint ? (
        <span className="ui-toggle-text">
          {label ? <span className="ui-toggle-label">{label}</span> : null}
          {hint ? <span className="ui-toggle-hint">{hint}</span> : null}
        </span>
      ) : null}
    </label>
  );
}
