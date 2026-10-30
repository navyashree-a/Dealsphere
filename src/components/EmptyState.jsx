import Icon from "./Icon";

// Dimensional illustration + message for empty screens.
function EmptyState({ icon = "tag", title, children, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__art" aria-hidden="true">
        <span className="empty-state__ticket empty-state__ticket--back" />
        <span className="empty-state__ticket empty-state__ticket--front">
          <Icon name={icon} size={30} />
        </span>
        <span className="empty-state__shadow" />
      </div>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}

export default EmptyState;
