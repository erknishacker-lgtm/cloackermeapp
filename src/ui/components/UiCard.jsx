/**
 * Card surface no padrao shadcn (card + border + radius + sombra leve).
 * Variantes: default | soft | dashed | interactive
 */
export function UiCard({
  children,
  className = '',
  variant = 'default',
  as: Tag = 'div',
  onClick,
  ...rest
}) {
  const classes = ['ui-card', `ui-card-${variant}`, className].filter(Boolean).join(' ');
  return (
    <Tag className={classes} onClick={onClick} {...rest}>
      {children}
    </Tag>
  );
}

export function UiCardHeader({ title, description, action, icon: Icon }) {
  return (
    <div className="ui-card-header">
      <div className="ui-card-header-main">
        {Icon ? (
          <div className="ui-card-icon" aria-hidden>
            <Icon size={16} />
          </div>
        ) : null}
        <div className="ui-card-header-copy">
          {title ? <h3 className="ui-card-title">{title}</h3> : null}
          {description ? <p className="ui-card-desc">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="ui-card-header-action">{action}</div> : null}
    </div>
  );
}

export function UiCardBody({ children, className = '' }) {
  return <div className={`ui-card-body ${className}`.trim()}>{children}</div>;
}

export function UiCardFooter({ children, className = '' }) {
  return <div className={`ui-card-footer ${className}`.trim()}>{children}</div>;
}
