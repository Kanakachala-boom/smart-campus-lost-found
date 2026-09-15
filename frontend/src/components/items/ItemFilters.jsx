import { useEffect, useState } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { CAMPUS_LOCATIONS, ITEM_CATEGORIES } from "../../utils/itemOptions";
import "./ItemFilters.css";

export function ItemFilters({
  type = "all", // 'all' | 'lost' | 'found'
  onTypeChange,
  search = "",
  onSearchChange,
  category = "ALL",
  onCategoryChange,
  location = "ALL",
  onLocationChange,
  status = "ACTIVE",
  onStatusChange,
  onReset,
  totalResults = 0,
}) {
  const [localSearch, setLocalSearch] = useState(search);

  // 300ms debounce for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange?.(localSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(localSearch) ||
    category !== "ALL" ||
    location !== "ALL" ||
    status !== "ACTIVE";

  const handleClearSearch = () => {
    setLocalSearch("");
    onSearchChange?.("");
  };

  const handleResetAll = () => {
    setLocalSearch("");
    onReset?.();
  };

  return (
    <div className="item-filters">
      {/* Top row: Type Tab Switcher */}
      <div className="item-filters__tabs-row">
        <div className="item-filters__tabs" role="tablist" aria-label="Filter items by report type">
          <button
            type="button"
            role="tab"
            aria-selected={type === "all"}
            className={`item-filters__tab ${type === "all" ? "item-filters__tab--active" : ""}`}
            onClick={() => onTypeChange("all")}
          >
            All Items
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={type === "lost"}
            className={`item-filters__tab ${type === "lost" ? "item-filters__tab--active" : ""}`}
            onClick={() => onTypeChange("lost")}
          >
            Lost Items
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={type === "found"}
            className={`item-filters__tab ${type === "found" ? "item-filters__tab--active" : ""}`}
            onClick={() => onTypeChange("found")}
          >
            Found Items
          </button>
        </div>

        <div className="item-filters__count" aria-live="polite">
          <span>{totalResults} {totalResults === 1 ? "item" : "items"} found</span>
        </div>
      </div>

      {/* Main search and dropdowns bar */}
      <div className="item-filters__toolbar">
        {/* Search Box */}
        <div className="item-filters__search-wrapper">
          <Search size={16} aria-hidden="true" className="item-filters__search-icon" />
          <input
            type="text"
            className="item-filters__search-input"
            placeholder="Search by title, description, or spot…"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            aria-label="Search items by keyword"
          />
          {localSearch && (
            <button
              type="button"
              className="item-filters__clear-search-btn"
              onClick={handleClearSearch}
              aria-label="Clear search text"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Dropdowns Group */}
        <div className="item-filters__dropdowns">
          {/* Category Filter */}
          <div className="item-filters__select-wrapper">
            <select
              id="filter-category"
              className="item-filters__select"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              aria-label="Filter by item category"
            >
              <option value="ALL">All Categories</option>
              {ITEM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="item-filters__select-wrapper">
            <select
              id="filter-location"
              className="item-filters__select"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              aria-label="Filter by campus location"
            >
              <option value="ALL">All Campus Locations</option>
              {CAMPUS_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="item-filters__select-wrapper">
            <select
              id="filter-status"
              className="item-filters__select"
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filter by item status"
            >
              <option value="ACTIVE">Active Only</option>
              <option value="ALL">All Statuses</option>
              <option value="POTENTIAL_MATCH">Potential Match</option>
              <option value="CLAIMED">Claimed</option>
              <option value="RETURNED">Returned / Closed</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              className="item-filters__reset-btn"
              onClick={handleResetAll}
              aria-label="Reset all search filters"
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ItemFilters;
