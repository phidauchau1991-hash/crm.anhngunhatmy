export default function PageHeader({ title, subtitle }) {
  return (
    <div className="page-header">
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
      <style jsx>{`
        .page-header {
          margin-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 16px;
        }
        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px 0;
        }
        .page-subtitle {
          font-size: 0.95rem;
          color: #6b7280;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
