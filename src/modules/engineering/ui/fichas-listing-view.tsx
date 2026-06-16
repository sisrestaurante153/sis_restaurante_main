"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { patchFichaQuickAction } from "@/modules/engineering/server/engineering-actions";
import { getFichaSearchSuggestionsAction } from "@/modules/platform/server/search-actions";
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
import type { FichaSortBy } from "@/modules/engineering/server/engineering-repository";


interface FichasListingViewProps {
  items: FichaListRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  query: string;
  status: string;
  modalidade?: string;
  grupo?: string;
  sortBy?: FichaSortBy;
  sortDir?: "asc" | "desc";
  modalidadeOptions?: { id: string; label: string }[];
  grupoOptions?: { id: string; label: string }[];
  didYouMean?: string | null;
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

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "ativa", label: "Ativa" },
  { value: "inativa", label: "Inativa" },
  { value: "arquivada", label: "Arquivada" }
];


function formatCurrency(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
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
  const color = percent >= 50 ? VERDE : VERM;
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

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface InlineEditCellProps {
  value: string;
  onSave: (next: string) => Promise<void>;
  align?: "left" | "right";
  style?: React.CSSProperties;
  children: React.ReactNode;
}

function InlineEditCell({ value, onSave, align = "left", style, children }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraft(value);
    setSaveStatus("idle");
    setEditing(true);
  }, [value]);

  const commitEdit = useCallback(async () => {
    const trimmed = draft.trim();
    if (trimmed === value.trim()) {
      setEditing(false);
      return;
    }
    setSaveStatus("saving");
    try {
      await onSave(trimmed);
      setSaveStatus("saved");
      setEditing(false);
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch {
      setSaveStatus("error");
    }
  }, [draft, value, onSave]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setSaveStatus("idle");
  }, []);

  if (editing) {
    return (
      <td
        style={{ ...style, padding: "4px 7px", verticalAlign: "middle" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); void commitEdit(); }
              if (e.key === "Escape") cancelEdit();
            }}
            onBlur={() => void commitEdit()}
            style={{
              fontSize: 12,
              padding: "2px 5px",
              border: "1px solid #185FA5",
              borderRadius: 4,
              outline: "none",
              width: "100%",
              textAlign: align,
              background: "#fff"
            }}
          />
          {saveStatus === "saving" && (
            <span style={{ fontSize: 10, color: "#888780", whiteSpace: "nowrap" }}>Salvando…</span>
          )}
          {saveStatus === "error" && (
            <span style={{ fontSize: 10, color: "#A32D2D", whiteSpace: "nowrap" }}>Erro</span>
          )}
        </div>
      </td>
    );
  }

  return (
    <td
      style={{ ...style, padding: "8px 7px", cursor: "text" }}
      onClick={startEdit}
      title="Clique para editar"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        {children}
        {saveStatus === "saved" && (
          <span style={{ fontSize: 10, color: "#1B6B2C", whiteSpace: "nowrap" }}>✓</span>
        )}
        {saveStatus === "error" && (
          <span style={{ fontSize: 10, color: "#A32D2D", whiteSpace: "nowrap" }}>Erro</span>
        )}
      </div>
    </td>
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
  modalidade = "all",
  grupo = "all",
  sortBy,
  sortDir,
  modalidadeOptions,
  grupoOptions,
  didYouMean
}: FichasListingViewProps) {
  const router = useRouter();
  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up("sm"));
  const [queryValue, setQueryValue] = useState(query);
  const [statusValue, setStatusValue] = useState(status);
  const [modalidadeValue, setModalidadeValue] = useState(modalidade ? decodeURIComponent(modalidade) : "all");
  const [grupoValue, setGrupoValue] = useState(grupo ? decodeURIComponent(grupo) : "all");

  const resolvedModalidades = useMemo(() => {
    const base = [{ value: "all", label: "Todas as modalidades" }];
    if (modalidadeOptions && modalidadeOptions.length > 0) {
      const sorted = [...modalidadeOptions].sort((a, b) => a.label.localeCompare(b.label));
      base.push(...sorted.map(m => ({ value: m.label, label: m.label })));
    } else {
      base.push(
        { value: "Delivery", label: "Delivery" },
        { value: "Presencial", label: "Presencial" }
      );
    }
    base.push({ value: "__none__", label: "Sem modalidade" });
    return base;
  }, [modalidadeOptions]);

  const resolvedGrupos = useMemo(() => {
    const base = [{ value: "all", label: "Todos os grupos" }];
    if (grupoOptions && grupoOptions.length > 0) {
      const sorted = [...grupoOptions].sort((a, b) => a.label.localeCompare(b.label));
      base.push(...sorted.map(g => ({ value: g.label, label: g.label })));
    } else {
      base.push(
        { value: "Marmitas", label: "Marmitas" },
        { value: "Pratos", label: "Pratos" },
        { value: "Bases", label: "Bases" }
      );
    }
    base.push({ value: "__none__", label: "Sem grupo" });
    return base;
  }, [grupoOptions]);

  useEffect(() => {
    setQueryValue(query);
    setStatusValue(status);
    setModalidadeValue(modalidade ? decodeURIComponent(modalidade) : "all");
    setGrupoValue(grupo ? decodeURIComponent(grupo) : "all");
  }, [query, status, modalidade, grupo]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigateImmediate(overrides: Parameters<typeof buildHref>[0]) {
    router.push(buildHref({ ...overrides, page: 1 }) as never);
  }

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (queryValue !== query) {
        navigateImmediate({ query: queryValue });
      }
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryValue]);

  // Save search parameters to sessionStorage
  useEffect(() => {
    const params = new URLSearchParams();
    if (queryValue.trim()) params.set("query", queryValue.trim());
    if (statusValue !== "all") params.set("status", statusValue);
    if (modalidadeValue !== "all") params.set("modalidade", modalidadeValue);
    if (grupoValue !== "all") params.set("grupo", grupoValue);
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 10) params.set("pageSize", String(pageSize));
    if (sortBy) params.set("sortBy", sortBy);
    if (sortDir) params.set("sortDir", sortDir);

    sessionStorage.setItem("fichas_listing_filters", params.toString());
  }, [queryValue, statusValue, modalidadeValue, grupoValue, page, pageSize, sortBy, sortDir]);

  // Restore search parameters from sessionStorage if URL has no search params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentSearch = window.location.search;
      if (!currentSearch) {
        const saved = sessionStorage.getItem("fichas_listing_filters");
        if (saved) {
          router.replace(`/fichas?${saved}` as never);
        }
      }
    }
  }, [router]);

  // items já vêm filtrados do servidor; useMemo mantido apenas como identidade
  const visibleItems = useMemo(() => items, [items]);

  function buildHref(next: {
    query?: string;
    status?: string;
    modalidade?: string | null;
    grupo?: string | null;
    page?: number;
    pageSize?: number;
    sortBy?: FichaSortBy | null;
    sortDir?: "asc" | "desc" | null;
  }) {
    const params = new URLSearchParams();
    const nextQuery = next.query ?? queryValue;
    const nextStatus = next.status ?? statusValue;
    const nextModalidade = next.modalidade === null ? "all" : (next.modalidade ?? modalidadeValue);
    const nextGrupo = next.grupo === null ? "all" : (next.grupo ?? grupoValue);
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
    if (nextModalidade !== "all") {
      params.set("modalidade", nextModalidade);
    }
    if (nextGrupo !== "all") {
      params.set("grupo", nextGrupo);
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
    const [hovered, setHovered] = useState(false);
    const isActive = sortBy === col;
    const activeColor = AZUL;
    const inactiveColor = "#C8C6BE";
    return (
      <th
        style={{ ...headerCellStyle, textAlign: align, cursor: "pointer", color: isActive ? AZUL : TEXT_3, background: hovered ? "#EAEAE8" : BG }}
        onClick={() => handleSortClick(col)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-sort={isActive ? (sortDir === "desc" ? "descending" : "ascending") : "none"}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start" }}>
          {label}
          <svg
            width="12"
            height="14"
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
          fetchSuggestions={getFichaSearchSuggestionsAction}
          onSuggestionSelect={(val) => {
            setQueryValue(val);
            navigateImmediate({ query: val });
          }}
        />

        <FlatSelect
          value={modalidadeValue}
          onChange={(next) => {
            setModalidadeValue(next);
            navigateImmediate({ modalidade: next });
          }}
          options={resolvedModalidades}
          ariaLabel="Modalidade"
          name="modalidade"
        />

        <FlatSelect
          value={grupoValue}
          onChange={(next) => {
            setGrupoValue(next);
            navigateImmediate({ grupo: next });
          }}
          options={resolvedGrupos}
          ariaLabel="Grupo"
          name="grupo"
        />

        <FlatSelect
          value={statusValue}
          onChange={(next) => {
            setStatusValue(next);
            navigateImmediate({ status: next });
          }}
          options={STATUS_OPTIONS}
          ariaLabel="Status"
          name="status"
        />
      </Stack>

      {didYouMean && (
        <div style={{ fontSize: 13, color: TEXT_2, marginTop: -8 }}>
          Você quis dizer:{" "}
          <Link
            href={buildHref({ query: didYouMean, page: 1 }) as never}
            onClick={() => {
              setQueryValue(didYouMean);
            }}
            style={{ color: AZUL, textDecoration: "underline", fontWeight: 500 }}
          >
            {didYouMean}
          </Link>
          ?
        </div>
      )}

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
            {`${totalCount} fichas encontradas`}
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
              <col />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 82 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 64 }} />
              <col style={{ width: 60 }} />
            </colgroup>
            <thead>
              <tr style={{ background: BG, borderBottom: `0.5px solid ${BORDER}` }}>
                <SortableHeader col="code" label="Codigo" />
                <SortableHeader col="produto" label="Produto" />
                <SortableHeader col="modalidade" label="Modalidade" />
                <SortableHeader col="grupo" label="Grupo Operacional" />
                <SortableHeader col="componentes" label="Componentes" align="center" />
                <SortableHeader col="fc" label="FC" align="right" />
                <SortableHeader col="ic" label="IC" align="right" />
                <SortableHeader col="totalCost" label="Custo Total" align="right" />
                <SortableHeader col="sellingPrice" label="Preco de Venda" align="right" />
                <SortableHeader col="margem" label="Margem" align="right" />
                <SortableHeader col="updatedAt" label="Ult. Atualizacao" />
                <SortableHeader col="status" label="Status" align="center" />
                <SortableHeader col="obs" label="Obs" align="center" />
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
                visibleItems.map((row) => (
                  <FichaRowView
                    key={row.id}
                    row={row}
                    cellStyle={cellStyle}
                    onNavigate={() => router.push(`/fichas/${row.id}` as never)}
                  />
                ))
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

function CellLink({ href, children, style }: { href: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <Link
      href={href as never}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        width: "100%",
        height: "100%",
        padding: "8px 7px",
        boxSizing: "border-box",
        ...style
      }}
    >
      {children}
    </Link>
  );
}

interface FichaRowViewProps {
  row: FichaListRow;
  cellStyle: React.CSSProperties;
  onNavigate?: () => void;
}

function FichaRowView({ row, cellStyle }: FichaRowViewProps) {
  const [hover, setHover] = useState(false);
  const [localName, setLocalName] = useState(row.itemName);
  const [localPrice, setLocalPrice] = useState(row.sellingPrice ?? "");

  const fc = formatPercent(row.correctionFactor);
  const ic = formatPercent(row.cookingIndex);
  const custoNumeric = Number(row.totalCost);
  const hasCusto = Number.isFinite(custoNumeric) && custoNumeric > 0;
  const pvFormatted = formatOptionalCurrency(localPrice || null);
  const statusLower = (row.status ?? "").toLowerCase();
  const isAtiva = statusLower === "ativa";
  const statusLabel = row.status
    ? row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase()
    : "";
  const modalityLabel = row.modalityLabel ?? "Sem modalidade";
  const groupLabel = row.groupOperational ?? "Sem grupo";

  const handleSaveName = useCallback(async (next: string) => {
    if (!next) throw new Error("Nome não pode estar vazio.");
    const result = await patchFichaQuickAction({ fichaId: row.id, name: next });
    if (!result.ok) throw new Error(result.message ?? "Erro ao salvar.");
    setLocalName(next);
  }, [row.id]);

  const handleSavePrice = useCallback(async (next: string) => {
    const num = next === "" ? "" : Number(next.replace(",", "."));
    if (num !== "" && (!Number.isFinite(num) || (num as number) < 0)) throw new Error("Valor inválido.");
    const result = await patchFichaQuickAction({ fichaId: row.id, sellingPrice: next === "" ? "" : String(num) });
    if (!result.ok) throw new Error(result.message ?? "Erro ao salvar.");
    setLocalPrice(next === "" ? "" : String(num));
  }, [row.id]);

  const linkCellStyle: React.CSSProperties = { ...cellStyle, padding: 0 };

  return (
    <tr
      style={{
        borderBottom: `0.5px solid ${BORDER}`,
        background: hover ? "#F7F7F5" : "transparent"
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <td style={linkCellStyle}>
        <CellLink href={`/fichas/${row.id}`}>
          <span style={{ fontSize: 11, color: TEXT_3 }}>
            {row.code && row.code.trim() !== "" ? row.code : "--"}
          </span>
        </CellLink>
      </td>
      <InlineEditCell value={localName} onSave={handleSaveName} style={{ ...cellStyle, whiteSpace: "normal", overflow: "visible", textOverflow: "clip" }}>
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
              title={localName}
              style={{
                wordBreak: "break-word",
                whiteSpace: "normal"
              }}
            >
              {localName}
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
      </InlineEditCell>
      <td style={{ ...linkCellStyle }} title={modalityLabel}>
        <CellLink href={`/fichas/${row.id}`} style={{ color: TEXT_3, fontSize: 11 }}>
          {modalityLabel}
        </CellLink>
      </td>
      <td style={{ ...linkCellStyle }} title={groupLabel}>
        <CellLink href={`/fichas/${row.id}`} style={{ color: TEXT_3, fontSize: 11 }}>
          {groupLabel}
        </CellLink>
      </td>
      <td style={{ ...linkCellStyle }}>
        <CellLink href={`/fichas/${row.id}`} style={{ textAlign: "center" }}>
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
        </CellLink>
      </td>
      <td style={{ ...linkCellStyle }}>
        <CellLink href={`/fichas/${row.id}`} style={{ textAlign: "right" }}>
          <span style={{ color: fc.color, fontWeight: 500 }}>{fc.text}</span>
        </CellLink>
      </td>
      <td style={{ ...linkCellStyle }}>
        <CellLink href={`/fichas/${row.id}`} style={{ textAlign: "right" }}>
          <span style={{ color: ic.color, fontWeight: 500 }}>{ic.text}</span>
        </CellLink>
      </td>
      <td style={{ ...linkCellStyle }}>
        <CellLink href={`/fichas/${row.id}`} style={{ textAlign: "right" }}>
          {hasCusto ? (
            <span style={{ color: VERDE, fontWeight: 500 }}>
              {formatCurrency(row.totalCost)}
            </span>
          ) : (
            <span style={{ color: TEXT_3 }}>R$ 0,00</span>
          )}
        </CellLink>
      </td>
      <InlineEditCell
        value={localPrice}
        onSave={handleSavePrice}
        align="right"
        style={{ ...cellStyle, textAlign: "right" }}
      >
        {pvFormatted ? (
          <span style={{ color: TEXT, fontWeight: 500 }}>{pvFormatted}</span>
        ) : (
          <span style={{ color: TEXT_3 }}>—</span>
        )}
      </InlineEditCell>
      <td style={{ ...linkCellStyle }}>
        <CellLink href={`/fichas/${row.id}`}>
          <MarginPill value={row.contributionMarginPercent} />
        </CellLink>
      </td>
      <td style={{ ...linkCellStyle }}>
        <CellLink href={`/fichas/${row.id}`} style={{ color: TEXT_3, fontSize: 11 }}>
          {formatDateShort(row.updatedAt)}
        </CellLink>
      </td>
      <td style={{ ...linkCellStyle }}>
        <CellLink href={`/fichas/${row.id}`} style={{ textAlign: "center" }}>
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
        </CellLink>
      </td>
      <td style={{ ...linkCellStyle }}>
        <CellLink href={`/fichas/${row.id}`} style={{ textAlign: "center" }}>
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
        </CellLink>
      </td>
    </tr>
  );
}
