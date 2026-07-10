export function PageHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <section className="page-header">
      <div>
        <h1>
          {Icon && <Icon size={30} />}
          {title}
        </h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </section>
  );
}
