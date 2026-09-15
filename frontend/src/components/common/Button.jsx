/**
 * Button primitive.
 *
 * Variants: primary | secondary | ghost | danger
 * Sizes: sm | md | lg
 *
 * While loading, the button is disabled and marked busy for assistive
 * technology, which also prevents duplicate form submissions.
 */

import { Loader2 } from "lucide-react";
import "./Button.css";

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  isLoading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon = null,
  className = "",
  ...rest
}) {
  const classes = [
    "btn",
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? "btn--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? (
        <Loader2 className="btn__spinner" size={16} aria-hidden="true" />
      ) : (
        Icon && <Icon size={16} aria-hidden="true" />
      )}
      <span>{children}</span>
    </button>
  );
}

export default Button;
