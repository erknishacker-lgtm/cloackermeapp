export function PageHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <section className="page-header">
      <div>
        <h1>
          {Icon && <Icon size={22} strokeWidth={1.75} />}
          {title}
        </h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action}
    </section>
  );
}
