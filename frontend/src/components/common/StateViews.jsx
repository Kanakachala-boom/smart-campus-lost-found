/**
 * Loading, error and empty state views.
 *
 * Every data-driven page must render one of these rather than a blank
 * screen. Keeping them in one file keeps the three states visually
 * consistent.
 */

import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import Button from "./Button";
import "./StateViews.css";

export function LoadingState({ message = "Loading…" }) {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <Loader2 className="state__spinner" size={28} aria-hidden="true" />
      <p className="state__message">{message}</p>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message = "We could not load this content. Please try again.",
  onRetry = null,
}) {
  return (
    <div className="state state--error" role="alert">
      <AlertCircle size={28} aria-hidden="true" className="state__icon state__icon--error" />
      <h4 className="state__title">{title}</h4>
      <p className="state__message">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  message = "",
  icon: Icon = Inbox,
  action = null,
}) {
  return (
    <div className="state state--empty">
      <Icon size={28} aria-hidden="true" className="state__icon" />
      <h4 className="state__title">{title}</h4>
      {message && <p className="state__message">{message}</p>}
      {action}
    </div>
  );
}
