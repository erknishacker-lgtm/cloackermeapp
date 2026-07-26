/**
 * Radio buttons no estilo Untitled UI (sm/md).
 * Ref: untitleduico/react components/base/radio-buttons
 */
export function UiRadioGroup({ name, value, onChange, options = [], size = 'sm', className = '', disabled = false }) {
  return (
    <div
      className={['ui-radio-group', `ui-radio-group-${size}`, className].filter(Boolean).join(' ')}
      role="radiogroup"
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={['ui-radio', selected ? 'is-selected' : '', disabled ? 'is-disabled' : '']
              .filter(Boolean)
              .join(' ')}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange?.(opt.value)}
              className="ui-radio-input"
            />
            <span className="ui-radio-base" aria-hidden>
              <span className="ui-radio-dot" />
            </span>
            {(opt.label || opt.hint) && (
              <span className="ui-radio-text">
                {opt.label ? <span className="ui-radio-label">{opt.label}</span> : null}
                {opt.hint ? <span className="ui-radio-hint">{opt.hint}</span> : null}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
