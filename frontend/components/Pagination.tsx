interface PaginationData {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface Props {
  pagination: PaginationData;
  currentPage: number;
  basePath: string; // "/" or "/admin"
}

export function Pagination({ pagination, currentPage, basePath }: Props) {
  if (pagination.totalPages <= 1) {
    return null;
  }

  const prevHref = currentPage === 2
    ? basePath
    : `${basePath}${basePath.includes('?') ? '&' : '?'}page=${currentPage - 1}`;

  const nextHref = `${basePath}${basePath.includes('?') ? '&' : '?'}page=${currentPage + 1}`;

  return (
    <div className="flex justify-center gap-4 mt-8">
      {pagination.hasPrev ? (
        <a
          href={prevHref}
          className="px-4 py-2 bg-foreground/5 border border-foreground/10 rounded-lg hover:bg-foreground/10 transition-colors"
        >
          ←
        </a>
      ) : (
        <span className="px-4 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground/20 cursor-not-allowed">
          ←
        </span>
      )}
      {pagination.hasNext ? (
        <a
          href={nextHref}
          className="px-4 py-2 bg-foreground/5 border border-foreground/10 rounded-lg hover:bg-foreground/10 transition-colors"
        >
          →
        </a>
      ) : (
        <span className="px-4 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground/20 cursor-not-allowed">
          →
        </span>
      )}
    </div>
  );
}
