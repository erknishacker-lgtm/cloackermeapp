export function PageHeader({ title, subtitle, icon: Icon, action, breadcrumb }) {
  return (
    <section className="page-header">
      <div className="page-header-copy">
        {breadcrumb ? <p className="page-breadcrumb">{breadcrumb}</p> : null}
        <h1>
          {Icon ? <Icon size={22} /> : null}
          {title}
        </h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {action}
    </section>
  );
}
