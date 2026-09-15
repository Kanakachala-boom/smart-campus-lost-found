/**
 * Surface container used for dashboard panels, item cards and form sections.
 */

import "./Card.css";

export function Card({
  children,
  title = null,
  action = null,
  padded = true,
  as: Tag = "section",
  className = "",
  ...rest
}) {
  const classes = ["card", padded ? "card--padded" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes} {...rest}>
      {(title || action) && (
        <header className="card__header">
          {title && <h3 className="card__title">{title}</h3>}
          {action && <div className="card__action">{action}</div>}
        </header>
      )}
      <div className="card__body">{children}</div>
    </Tag>
  );
}

export default Card;
