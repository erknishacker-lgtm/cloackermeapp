export function Field({ label, hint, children, required }) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <strong> *</strong>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
