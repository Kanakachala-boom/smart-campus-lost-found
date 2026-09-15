/**
 * Stage 1 verification page — TEMPORARY.
 *
 * This is not an application page. It exists only so the design tokens,
 * theming and foundation components can be seen working. It contains no
 * business logic and calls no services. It is removed once real pages are
 * built in a later stage.
 */

import { PackageSearch } from "lucide-react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import StatusBadge from "../components/common/StatusBadge";
import ThemeToggle from "../components/common/ThemeToggle";
import { EmptyState, ErrorState, LoadingState } from "../components/common/StateViews";
import { CLAIM_STATUS_META } from "../utils/statusMaps";
import "./FoundationCheck.css";

export function FoundationCheck() {
  return (
    <div className="check">
      <header className="check__header">
        <div className="check__header-main">
          <div className="check__badge-row">
            <span className="check__pill">Stage 1 Foundation</span>
            <span className="check__meta-tag">Light Theme Default</span>
          </div>
          <h1 className="check__title">Smart Campus Lost &amp; Found</h1>
          <p className="check__subtitle">
            Clean, light-first university application design system. This page demonstrates
            core design tokens, accessible components, and database status mappings.
          </p>
        </div>
        <div className="check__header-actions">
          <ThemeToggle />
        </div>
      </header>

      <div className="check__grid">
        <Card title="Buttons" className="check__card">
          <p className="check__section-desc">
            Standard interactive controls using university blue and accessible contrast states.
          </p>
          <div className="check__group">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" isLoading>
              Loading
            </Button>
          </div>
        </Card>

        <Card title="claims.status (from the database)" className="check__card">
          <p className="check__section-desc">
            Exact database status values with accessible, soft-tone status badges.
          </p>
          <div className="check__badge-list">
            {Object.entries(CLAIM_STATUS_META).map(([key, { label, tone }]) => (
              <StatusBadge key={key} label={label} tone={tone} />
            ))}
          </div>
        </Card>

        <Card title="Loading state" className="check__card">
          <LoadingState message="Loading campus registry records…" />
        </Card>

        <Card title="Error state" className="check__card">
          <ErrorState onRetry={() => {}} />
        </Card>

        <Card title="Empty state" className="check__card check__card--full">
          <EmptyState
            title="No lost items found"
            message="Try adjusting your filters or report a lost item on campus."
            icon={PackageSearch}
          />
        </Card>
      </div>
    </div>
  );
}

export default FoundationCheck;
