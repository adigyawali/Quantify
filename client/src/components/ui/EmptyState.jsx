import Button from './Button';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      {title && <div className="empty-state-title">{title}</div>}
      {description && <div className="empty-state-text">{description}</div>}
      {action && (
        <div style={{ marginTop: 16 }}>
          <Button onClick={action.onClick} leading={action.icon}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
