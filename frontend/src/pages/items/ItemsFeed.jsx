import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, PackageSearch, PlusCircle, Shield } from "lucide-react";
import ItemCard from "../../components/items/ItemCard";
import ItemFilters from "../../components/items/ItemFilters";
import Pagination from "../../components/items/Pagination";
import ThemeToggle from "../../components/common/ThemeToggle";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/StateViews";
import useAuth from "../../hooks/useAuth";
import itemsService from "../../services/itemsService";
import "./ItemsFeed.css";

export function ItemsFeed() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state synchronization
  const typeParam = searchParams.get("type") || "all";
  const searchParam = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category") || "ALL";
  const locationParam = searchParams.get("location") || "ALL";
  const statusParam = searchParams.get("status") || "ACTIVE";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const updateFilters = useCallback(
    (updates) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(updates).forEach(([k, v]) => {
          if (!v || v === "ALL" || (k === "page" && v === 1) || (k === "status" && v === "ACTIVE" && !prev.has("status"))) {
            if (k === "page" && v === 1) next.delete("page");
            else if (v === "ALL") next.delete(k);
            else if (!v) next.delete(k);
            else next.set(k, v);
          } else {
            next.set(k, v);
          }
        });
        return next;
      });
    },
    [setSearchParams],
  );

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await itemsService.listItems({
        type: typeParam,
        search: searchParam,
        category: categoryParam,
        location: locationParam,
        status: statusParam,
        page: pageParam,
        limit: 9,
      });

      setItems(response.items || []);
      setTotalItems(response.total || 0);
      setTotalPages(response.total_pages || 1);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load campus items. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [typeParam, searchParam, categoryParam, locationParam, statusParam, pageParam]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await itemsService.listItems({
          type: typeParam,
          search: searchParam,
          category: categoryParam,
          location: locationParam,
          status: statusParam,
          page: pageParam,
          limit: 9,
        });

        if (!cancelled) {
          setItems(response.items || []);
          setTotalItems(response.total || 0);
          setTotalPages(response.total_pages || 1);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load campus items. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [typeParam, searchParam, categoryParam, locationParam, statusParam, pageParam]);

  const handleTypeChange = (newType) => {
    updateFilters({ type: newType, page: 1 });
  };

  const handleSearchChange = (newSearch) => {
    updateFilters({ q: newSearch, page: 1 });
  };

  const handleCategoryChange = (newCategory) => {
    updateFilters({ category: newCategory, page: 1 });
  };

  const handleLocationChange = (newLocation) => {
    updateFilters({ location: newLocation, page: 1 });
  };

  const handleStatusChange = (newStatus) => {
    updateFilters({ status: newStatus, page: 1 });
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams({ type: typeParam }));
  };

  const handlePageChange = (newPage) => {
    updateFilters({ page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="items-feed-page">
      {/* Header bar */}
      <header className="items-feed-header">
        <div className="items-feed-header__topbar">
          <div className="items-feed-header__brand-group">
            <Link to="/" className="items-feed-header__back-link" aria-label="Return to Home">
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Home</span>
            </Link>
            <span className="items-feed-header__divider" aria-hidden="true">/</span>
            <div className="items-feed-header__institution">
              <Shield size={14} aria-hidden="true" className="items-feed-header__shield-icon" />
              <span>The National Institute of Engineering</span>
            </div>
          </div>

          <div className="items-feed-header__actions">
            {user && (
              <div className="items-feed-header__user-badge">
                <span className="items-feed-header__user-name">{user.name}</span>
                <span className="items-feed-header__user-email">{user.email}</span>
              </div>
            )}
            <ThemeToggle />
            <Link to="/report/lost" className="btn btn--primary btn--sm items-feed-header__report-btn">
              <PlusCircle size={15} aria-hidden="true" />
              <span>Report Item</span>
            </Link>
          </div>
        </div>

        <div className="items-feed-hero">
          <div className="items-feed-hero__content">
            <h1 className="items-feed-hero__title">Campus Lost &amp; Found Registry</h1>
            <p className="items-feed-hero__subtitle">
              Browse, search, and identify belongings lost or found across the NIE Mysuru campus.
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="items-feed-container" id="main-content">
        {/* Filter controls */}
        <ItemFilters
          type={typeParam}
          onTypeChange={handleTypeChange}
          search={searchParam}
          onSearchChange={handleSearchChange}
          category={categoryParam}
          onCategoryChange={handleCategoryChange}
          location={locationParam}
          onLocationChange={handleLocationChange}
          status={statusParam}
          onStatusChange={handleStatusChange}
          onReset={handleResetFilters}
          totalResults={totalItems}
        />

        {/* Results grid or state views */}
        {isLoading ? (
          <div className="items-feed__state-wrapper">
            <LoadingState message="Searching campus items repository…" />
          </div>
        ) : error ? (
          <div className="items-feed__state-wrapper">
            <ErrorState message={error} onRetry={fetchItems} />
          </div>
        ) : items.length === 0 ? (
          <div className="items-feed__state-wrapper">
            <EmptyState
              title="No items found"
              message="No matching lost or found records correspond to your search or filters. Try clearing your filters or report an item."
              icon={PackageSearch}
              action={
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={handleResetFilters}
                >
                  Clear All Filters
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className="items-grid" role="region" aria-label="Items List">
              {items.map((item) => (
                <ItemCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>

            {/* Numbered Pagination */}
            <Pagination
              currentPage={pageParam}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default ItemsFeed;
