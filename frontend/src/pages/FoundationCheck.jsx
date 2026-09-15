/**
 * Stage 1 verification page — TEMPORARY.
 *
 * This is not an application page. It exists only so the design tokens,
 * theming and foundation components can be seen working. It contains no
 * business logic and calls no services. It is removed once real pages are
 * built in a later stage.
 */

import { Link } from "react-router-dom";
import { CheckCircle2, KeyRound, LogIn, Mail, PackageSearch, Search, ShieldCheck } from "lucide-react";
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
        <Card title="Stage 2 — NIE Authentication Flow" className="check__card check__card--full">
          <p className="check__section-desc">
            Test the Stage 2 authentication screens for NIE students: institutional login, @nie.ac.in domain validation, password recovery, and protected route gating.
          </p>
          <div className="check__group">
            <Link to="/login">
              <Button variant="primary" icon={LogIn}>
                Sign In
              </Button>
            </Link>
            <Link to="/forgot-password">
              <Button variant="secondary" icon={Mail}>
                Forgot Password
              </Button>
            </Link>
            <Link to="/reset-password">
              <Button variant="secondary" icon={KeyRound}>
                Reset Password
              </Button>
            </Link>
            <Link to="/auth-test">
              <Button variant="ghost" icon={ShieldCheck}>
                Protected Route (/auth-test)
              </Button>
            </Link>
          </div>
        </Card>

        <Card title="Stage 3 — Report Item Flow (Protected)" className="check__card check__card--full">
          <p className="check__section-desc">
            Test the Stage 3 reporting screens: Report Lost Item, Report Found Item, campus location selection, image drag &amp; drop, custody tracking, and confidential verification marks.
          </p>
          <div className="check__group">
            <Link to="/report/lost">
              <Button variant="primary" icon={Search}>
                Report Lost Item
              </Button>
            </Link>
            <Link to="/report/found">
              <Button variant="secondary" icon={CheckCircle2}>
                Report Found Item
              </Button>
            </Link>
          </div>
        </Card>

        <Card title="Stage 4 — Browse &amp; Search Items (Protected)" className="check__card check__card--full">
          <p className="check__section-desc">
            Test the Stage 4 browsing &amp; search experience: unified All/Lost/Found tabs, debounced search, category/location/status filters, 9-item pagination, and item detail pages with Stage 5/6 bridges.
          </p>
          <div className="check__group">
            <Link to="/items">
              <Button variant="primary" icon={PackageSearch}>
                Browse Registry (/items)
              </Button>
            </Link>
            <Link to="/items?type=lost">
              <Button variant="secondary" icon={Search}>
                Lost Items Feed
              </Button>
            </Link>
            <Link to="/items?type=found">
              <Button variant="secondary" icon={CheckCircle2}>
                Found Items Feed
              </Button>
            </Link>
          </div>
        </Card>

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
