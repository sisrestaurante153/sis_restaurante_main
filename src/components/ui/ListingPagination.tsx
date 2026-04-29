"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

/**
 * HTML-matching numbered pagination component.
 * Mirrors update/tela-fichas-grade-v1.html and update/tela-itens-grade-v2.html pagination:
 *   .pag-btn { border:0.5px solid #D3D1C7; border-radius:4px; padding:4px 10px; font-size:12px; color:#5F5E5A; bg:#fff }
 *   .pag-btn.active { bg:#185FA5; border-color:#185FA5; color:#fff }
 * Left text: "Mostrando X-Y de Z {itemsNoun}".
 * Right: [Anterior] [numbers with ellipsis when >7 pages] [Proximo].
 */
export interface ListingPaginationProps {
  page: number; // 1-based
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  itemsNoun: string; // e.g. "fichas" | "itens"
}

type PagToken = number | "...";

function buildPageTokens(current: number, totalPages: number): PagToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  const tokens: PagToken[] = [];
  const firstPages: number[] = [1, 2];
  const lastPages: number[] = [totalPages - 1, totalPages];
  const middle: number[] = [current - 1, current, current + 1].filter(
    (n) => n > 2 && n < totalPages - 1
  );
  const set = new Set<number>([...firstPages, ...middle, ...lastPages]);
  const sorted = Array.from(set).sort((a, b) => a - b);
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) tokens.push("...");
    tokens.push(n);
    prev = n;
  }
  return tokens;
}

export function ListingPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  itemsNoun
}: ListingPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const tokens = buildPageTokens(page, totalPages);

  const btnBaseSx = {
    padding: "4px 10px",
    fontSize: 12,
    lineHeight: 1.4,
    color: "#5F5E5A",
    border: "0.5px solid #D3D1C7",
    borderRadius: "4px",
    bgcolor: "#fff",
    cursor: "pointer",
    minWidth: 30,
    fontFamily: "inherit",
    "&:hover:not(:disabled):not([data-ellipsis='true'])": { bgcolor: "#F4F4F2" },
    "&:disabled": { opacity: 0.4, cursor: "default" }
  } as const;

  const activeSx = {
    ...btnBaseSx,
    bgcolor: "#185FA5",
    borderColor: "#185FA5",
    color: "#fff",
    "&:hover": { bgcolor: "#185FA5" }
  } as const;

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        padding: "10px 16px",
        borderTop: "0.5px solid #D3D1C7",
        fontSize: 12,
        color: "#888780",
        flexWrap: "wrap",
        gap: 1
      }}
    >
      <Typography
        component="span"
        sx={{ fontSize: 12, color: "#888780" }}
        data-testid="listing-pagination-info"
      >
        {`Mostrando ${start}-${end} de ${totalCount} ${itemsNoun}`}
      </Typography>

      <Stack direction="row" spacing={0.5} role="navigation" aria-label="Paginacao">
        <Box
          component="button"
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          sx={btnBaseSx}
        >
          Anterior
        </Box>

        {tokens.map((token, idx) =>
          token === "..." ? (
            <Box
              key={`ellipsis-${idx}`}
              component="button"
              type="button"
              data-ellipsis="true"
              disabled
              sx={btnBaseSx}
            >
              ...
            </Box>
          ) : (
            <Box
              key={token}
              component="button"
              type="button"
              aria-current={token === page ? "page" : undefined}
              onClick={() => onPageChange(token)}
              sx={token === page ? activeSx : btnBaseSx}
            >
              {token}
            </Box>
          )
        )}

        <Box
          component="button"
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          sx={btnBaseSx}
        >
          Proximo
        </Box>
      </Stack>
    </Stack>
  );
}
