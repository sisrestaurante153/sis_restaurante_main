"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Fab from "@mui/material/Fab";
import Stack from "@mui/material/Stack";
import { FlatSearchInput } from "@/components/ui/FlatSearchInput";
import { FlatSelect } from "@/components/ui/FlatSelect";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { ListingPagination } from "@/components/ui/ListingPagination";

interface FichaListRow {
  id: string;
  itemId: string;
  code?: string;
  itemName: string;
  itemType: string;
  version: number;
  modalityLabel?: string;
  groupOperational?: string;
  status: string;
  correctionFactor?: string | null;
  cookingIndex?: string | null;
  totalCost: string;
  sellingPrice?: string | null;
  contributionMarginPercent?: string | null;
  updatedAt: string;
  componentCount: number;
  notes?: string;
}

type FichaSortBy = "code" | "produto" | "modalidade" | "grupo" | "sellingPrice" | "updatedAt" | "status";

interface FichasListingViewProps {
  items: FichaListRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  query: string;
  status: string;
  sortBy?: FichaSortBy;
  sortDir?: "asc" | "desc";
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const BORDER = "#D3D1C7";
const TEXT = "#2C2C2A";
const TEXT_2 = "#5F5E5A";
const TEXT_3 = "#888780";
const BG = "#F4F4F2";
const AZUL = "#185FA5";
const AZUL_L = "#E6F1FB";
const AZUL_B = "#B5D4F4";
const VERDE = "#1B6B2C";
const VERDE_L = "#EAF3DE";
const VERDE_TEXT = "#27500A";
const INATIVA_BG = "#F1EFE8";
const INATIVA_TEXT = "#444441";
const VERM = "#A32D2D";
const AMBAR = "#854F0B";

const MODALIDADE_OPTIONS = [
  { value: "all", label: "Todas as modalidades" },
  { value: "Delivery", label: "Delivery" },
  { value: "Presencial", label: "Presencial" },
  { value: "__none__", label: "Sem modalidade" }
];

const GRUPO_OPTIONS = [
  { value: "all", label: "Todos os grupos" },
  { value: "Marmitas", label: "Marmitas" },
  { value: "Pratos", label: "Pratos" },
  { value: "Bases", label: "Bases" },
  { value: "__none__", label: "Sem grupo" }
];

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "ativa", label: "Ativa" },
  { value: "inativa", label: "Inativa" },
  { value: "arquivada", label: "Arquivada" }
];

function matchesSelect(selectValue: string, rowValue?: string | null) {
  if (selectValue === "all") return true;
  if (selectValue === "__none__") {
    return !rowValue || rowValue.trim() === "" || /sem /i.test(rowValue);
  }
  return (rowValue ?? "").toLowerCase() === selectValue.toLowerCase();
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

function formatOptionalCurrency(value?: string | null) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return formatCurrency(value);
}

function formatPercent(value?: string | null): { text: string; color: string } {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed)) {
    return { text: "—", color: TEXT_3 };
  }
  const percent = Math.round(parsed * 100);
  const color = percent >= 100 ? VERDE : VERM;
  return { text: `${percent}%`, color };
}

function formatDateShort(isoString: string) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function MarginPill({ value }: { value?: string | null }) {
  const parsed = value === null || value === undefined || value === "" ? null : Number(value);
  const mc = parsed !== null && Number.isFinite(parsed) ? parsed * 100 : null;
  const pct = mc === null ? 0 : Math.max(0, Math.min(100, mc));
  const color =
    mc === null ? TEXT_3 : mc > 60 ? VERDE : mc >= 35 ? AMBAR : VERM;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
      <div
        style={{
          width: 54,
          height: 4,
          background: BORDER,
          borderRadius: 2,
          overflow: "hidden",
          flexShrink: 0
        }}
        aria-hidden="true"
      >
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, color, minWidth: 28, textAlign: "right" }}>
        {mc === null ? "--" : `${Math.round(pct)}%`}
      </span>
    </div>
  );
}

export function DesktopNewFichaAction() {
  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up("sm"));

  if (!smUp) {
    return null;
  }

  return (
    <Button component={Link} href="/fichas/nova" variant="contained" startIcon={<AddIcon />}>
      Nova ficha
    </Button>
  );
}

export function FichasListingView({
  items,
  page,
  pageSize,
  totalCount,
  query,
  status,
  sortBy,
  sortDir
}: FichasListingViewProps) {
  const router = useRouter();
  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up("sm"));
  const [queryValue, setQueryValue] = useState(query);
  const [statusValue, setStatusValue] = useState(status);
  const [modalidadeValue, setModalidadeValue] = useState("all");
  const [grupoValue, setGrupoValue] = useState("all");

  useEffect(() => {
    setQueryValue(query);
    setStatusValue(status);
  }, [query, status]);

  const visibleItems = useMemo(
    () =>
      items.filter(
        (row) =>
          matchesSelect(modalidadeValue, row.modalityLabel) &&
          matchesSelect(grupoValue, row.groupOperational)
      ),
    [items, modalidadeValue, grupoValue]
  );

  function buildHref(next: {
    query?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    sortBy?: FichaSortBy | null;
    sortDir?: "asc" | "desc" | null;
  }) {
    const params = new URLSearchParams();
    const nextQuery = next.query ?? queryValue;
    const nextStatus = next.status ?? statusValue;
    const nextPage = next.page ?? page;
    const nextPageSize = next.pageSize ?? pageSize;
    const nextSortBy = next.sortBy === null ? undefined : (next.sortBy ?? sortBy);
    const nextSortDir = next.sortDir === null ? undefined : (next.sortDir ?? sortDir);

    if (nextQuery.trim()) {
      params.set("query", nextQuery.trim());
    }
    if (nextStatus !== "all") {
      params.set("status", nextStatus);
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    if (nextPageSize !== 10) {
      params.set("pageSize", String(nextPageSize));
    }
    if (nextSortBy) {
      params.set("sortBy", nextSortBy);
    }
    if (nextSortDir) {
      params.set("sortDir", nextSortDir);
    }
    const search = params.toString();
    return search ? `/fichas?${search}` : "/fichas";
  }

  function handleSortClick(col: FichaSortBy) {
    if (sortBy === col) {
      if (sortDir === "asc") {
        router.push(buildHref({ page: 1, sortBy: col, sortDir: "desc" }) as never);
      } else {
        router.push(buildHref({ page: 1, sortBy: null, sortDir: null }) as never);
      }
    } else {
      router.push(buildHref({ page: 1, sortBy: col, sortDir: "asc" }) as never);
    }
  }

  const headerCellStyle: React.CSSProperties = {
    padding: "8px 7px",
    fontSize: 10,
    fontWeight: 600,
    color: TEXT_3,
    textAlign: "left",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    userSelect: "none"
  };

  function SortableHeader({
    col,
    label,
    align = "left"
  }: {
    col: FichaSortBy;
    label: string;
    align?: "left" | "right" | "center";
  }) {
    const isActive = sortBy === col;
    const activeColor = AZUL;
    const inactiveColor = "#C8C6BE";
    return (
      <th
        style={{ ...headerCellStyle, textAlign: align, cursor: "pointer" }}
        onClick={() => handleSortClick(col)}
        aria-sort={isActive ? (sortDir === "desc" ? "descending" : "ascending") : "none"}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start" }}>
          {label}
          <svg
            width="8"
            height="10"
            viewBox="0 0 8 10"
            fill="none"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M4 1L1.5 4H6.5L4 1Z"
              fill={isActive && sortDir === "asc" ? activeColor : inactiveColor}
            />
            <path
              d="M4 9L6.5 6H1.5L4 9Z"
              fill={isActive && sortDir === "desc" ? activeColor : inactiveColor}
            />
          </svg>
        </span>
      </th>
    );
  }

  const cellStyle: React.CSSProperties = {
    padding: "8px 7px",
    fontSize: 12,
    color: TEXT,
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  };

  return (
    <Stack spacing={"18px"}>
      <Stack
        component="form"
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: "10px" }}
        alignItems={{ sm: "center" }}
        sx={{ mb: 0 }}
        onSubmit={(event) => {
          event.preventDefault();
          router.push(buildHref({ query: queryValue, status: statusValue, page: 1 }) as never);
        }}
      >
        <FlatSearchInput
          value={queryValue}
          onChange={(next) => setQueryValue(next)}
          placeholder="Buscar ficha..."
          ariaLabel="Buscar ficha"
          name="query"
        />

        <FlatSelect
          value={modalidadeValue}
          onChange={(next) => setModalidadeValue(next)}
          options={MODALIDADE_OPTIONS}
          ariaLabel="Modalidade"
          name="modalidade"
        />

        <FlatSelect
          value={grupoValue}
          onChange={(next) => setGrupoValue(next)}
          options={GRUPO_OPTIONS}
          ariaLabel="Grupo"
          name="grupo"
        />

        <FlatSelect
          value={statusValue}
          onChange={(next) => setStatusValue(next)}
          options={STATUS_OPTIONS}
          ariaLabel="Status"
          name="status"
        />
      </Stack>

      <Box
        sx={{
          background: "#fff",
          border: `0.5px solid ${BORDER}`,
          borderRadius: "10px",
          overflow: "hidden"
        }}
      >
        <Box
          sx={{
            padding: "10px 16px",
            borderBottom: `0.5px solid ${BORDER}`
          }}
        >
          <Box
            component="div"
            sx={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: TEXT_3,
              textTransform: "uppercase"
            }}
          >
            Fichas Tecnicas
          </Box>
          <Box sx={{ fontSize: 11, color: TEXT_3, marginTop: "2px" }}>
            {modalidadeValue !== "all" || grupoValue !== "all"
              ? `${visibleItems.length} de ${totalCount} fichas encontradas`
              : `${totalCount} fichas encontradas`}
          </Box>
        </Box>

        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed"
            }}
          >
            <colgroup>
              <col style={{ width: 60 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 82 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 82 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 64 }} />
              <col style={{ width: 38 }} />
            </colgroup>
            <thead>
              <tr style={{ background: BG, borderBottom: `0.5px solid ${BORDER}` }}>
                <SortableHeader col="code" label="Codigo" />
                <SortableHeader col="produto" label="Produto" />
                <SortableHeader col="modalidade" label="Modalidade" />
                <SortableHeader col="grupo" label="Grupo Operacional" />
                <th style={{ ...headerCellStyle, textAlign: "center" }}>Componentes</th>
                <th style={{ ...headerCellStyle, textAlign: "right" }}>FC</th>
                <th style={{ ...headerCellStyle, textAlign: "right" }}>IC</th>
                <th style={{ ...headerCellStyle, textAlign: "right" }}>Custo Total</th>
                <SortableHeader col="sellingPrice" label="Preco de Venda" align="right" />
                <th style={{ ...headerCellStyle, textAlign: "right" }}>Margem</th>
                <SortableHeader col="updatedAt" label="Ult. Atualizacao" />
                <SortableHeader col="status" label="Status" align="center" />
                <th style={{ ...headerCellStyle, textAlign: "center" }}>Obs</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    style={{
                      textAlign: "center",
                      padding: "32px",
                      color: TEXT_3,
                      fontSize: 12
                    }}
                  >
                    Nenhuma ficha encontrada. Tente ajustar os filtros.
                  </td>
                </tr>
              ) : (
                visibleItems.map((row) => {
                  const fc = formatPercent(row.correctionFactor);
                  const ic = formatPercent(row.cookingIndex);
                  const custoNumeric = Number(row.totalCost);
                  const hasCusto = Number.isFinite(custoNumeric) && custoNumeric > 0;
                  const pvFormatted = formatOptionalCurrency(row.sellingPrice);
                  const statusLower = (row.status ?? "").toLowerCase();
                  const isAtiva = statusLower === "ativa";
                  const statusLabel = row.status
                    ? row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase()
                    : "";
                  const modalityLabel = row.modalityLabel ?? "Sem modalidade";
                  const groupLabel = row.groupOperational ?? "Sem grupo";

                  return (
                    <Link
                      key={row.id}
                      href={`/fichas/${row.id}`}
                      style={{
                        display: "table-row",
                        borderBottom: `0.5px solid ${BORDER}`,
                        cursor: "pointer",
                        textDecoration: "none",
                        color: "inherit"
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = "#F7F7F5";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={cellStyle}>
                        <span style={{ fontSize: 11, color: TEXT_3 }}>
                           {row.code && row.code.trim() !== "" ? row.code : "--"}
                        </span>
                      </td>
                      <td style={cellStyle}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              overflow: "hidden",
                              fontWeight: 500,
                              fontSize: 13,
                              color: TEXT
                            }}
                          >
                            <span
                              title={row.itemName}
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {row.itemName}
                            </span>
                            <span
                              style={{
                                flexShrink: 0,
                                fontSize: 10,
                                fontWeight: 600,
                                color: AZUL,
                                background: AZUL_L,
                                border: `0.5px solid ${AZUL_B}`,
                                borderRadius: 4,
                                padding: "1px 5px"
                              }}
                            >
                              V{row.version}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: TEXT_3 }}>
                            {`${modalityLabel.toLowerCase()} · ${groupLabel.toLowerCase()}`}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...cellStyle, color: TEXT_3, fontSize: 11 }} title={modalityLabel}>
                        {modalityLabel}
                      </td>
                      <td style={{ ...cellStyle, color: TEXT_3, fontSize: 11 }} title={groupLabel}>
                        {groupLabel}
                      </td>
                      <td style={{ ...cellStyle, textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontWeight: 500,
                            background: BG,
                            border: `0.5px solid ${BORDER}`,
                            color: TEXT_2
                          }}
                        >
                          {`${row.componentCount} ${row.componentCount === 1 ? "item" : "itens"}`}
                        </span>
                      </td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>
                        <span style={{ color: fc.color, fontWeight: 500 }}>{fc.text}</span>
                      </td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>
                        <span style={{ color: ic.color, fontWeight: 500 }}>{ic.text}</span>
                      </td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>
                        {hasCusto ? (
                          <span style={{ color: VERDE, fontWeight: 500 }}>
                            {formatCurrency(row.totalCost)}
                          </span>
                        ) : (
                          <span style={{ color: TEXT_3 }}>R$ 0,00</span>
                        )}
                      </td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>
                        {pvFormatted ? (
                          <span style={{ color: TEXT, fontWeight: 500 }}>{pvFormatted}</span>
                        ) : (
                          <span style={{ color: TEXT_3 }}>—</span>
                        )}
                      </td>
                      <td style={{ ...cellStyle }}>
                        <MarginPill value={row.contributionMarginPercent} />
                      </td>
                      <td style={{ ...cellStyle, color: TEXT_3, fontSize: 11 }}>
                        {formatDateShort(row.updatedAt)}
                      </td>
                      <td style={{ ...cellStyle, textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 10,
                            padding: "2px 7px",
                            borderRadius: 4,
                            fontWeight: 500,
                            background: isAtiva ? VERDE_L : INATIVA_BG,
                            color: isAtiva ? VERDE_TEXT : INATIVA_TEXT
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ ...cellStyle, textAlign: "center" }}>
                        {row.notes ? (
                          <span
                            title={row.notes}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: AZUL
                            }}
                            aria-label="Ver observacao"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              aria-hidden="true"
                            >
                              <circle cx="8" cy="8" r="6.5" />
                              <line x1="8" y1="7" x2="8" y2="11" />
                              <circle cx="8" cy="5" r="0.5" fill="currentColor" />
                            </svg>
                          </span>
                        ) : (
                          <span style={{ color: TEXT_3 }}>—</span>
                        )}
                      </td>
                    </Link>
                  );
                })
              )}
            </tbody>
          </table>
        </Box>

        <ListingPagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          itemsNoun="fichas"
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={(nextPage) =>
            router.push(buildHref({ page: nextPage }) as never)
          }
          onPageSizeChange={(nextSize) =>
            router.push(buildHref({ page: 1, pageSize: nextSize }) as never)
          }
        />
      </Box>

      {!smUp ? (
        <Fab
          color="primary"
          component={Link}
          href="/fichas/nova"
          aria-label="Nova ficha"
          sx={{ position: "fixed", right: 16, bottom: 24, zIndex: (theme) => theme.zIndex.appBar }}
        >
          <AddIcon />
        </Fab>
      ) : null}
    </Stack>
  );
}
