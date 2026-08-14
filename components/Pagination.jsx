export default function Pagination({ currentPage, totalPages, onPageChange }) {
    return (
      <div className="flex justify-end items-center space-x-4 mt-4">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1 bg-burgundy-600 disabled:bg-gray-500 text-white rounded-md"
        >
          Prev
        </button>
        <span className="text-white">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 bg-burgundy-600 disabled:bg-gray-500 text-white rounded-md"
        >
          Next
        </button>
      </div>
    );
  }
  