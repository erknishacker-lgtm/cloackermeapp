/**
 * Empty state compacto (modelo de widget reutilizavel).
 */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="ui-empty">
      {Icon ? (
        <div className="ui-empty-icon" aria-hidden>
          <Icon size={20} />
        </div>
      ) : null}
      {title ? <strong className="ui-empty-title">{title}</strong> : null}
      {description ? <p className="ui-empty-desc">{description}</p> : null}
      {action ? <div className="ui-empty-action">{action}</div> : null}
    </div>
  );
}
