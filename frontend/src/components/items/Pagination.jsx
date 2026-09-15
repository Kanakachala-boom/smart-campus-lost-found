import { ChevronLeft, ChevronRight } from "lucide-react";
import "./Pagination.css";

export function Pagination({ currentPage = 1, totalPages = 1, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className="pagination" aria-label="Items pagination">
      <button
        type="button"
        className="pagination__btn pagination__btn--nav"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        <span>Previous</span>
      </button>

      <div className="pagination__pages">
        {pages.map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            className={`pagination__btn pagination__btn--num ${
              pageNum === currentPage ? "pagination__btn--active" : ""
            }`}
            onClick={() => onPageChange(pageNum)}
            aria-current={pageNum === currentPage ? "page" : undefined}
            aria-label={`Page ${pageNum}`}
          >
            {pageNum}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="pagination__btn pagination__btn--nav"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        <span>Next</span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}

export default Pagination;
