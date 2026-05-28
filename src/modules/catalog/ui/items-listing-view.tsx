"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AddIcon from "@mui/icons-material/Add";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Fab from "@mui/material/Fab";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { FlatSearchInput } from "@/components/ui/FlatSearchInput";
import { FlatSelect } from "@/components/ui/FlatSelect";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { ListingPagination } from "@/components/ui/ListingPagination";
import { patchItemQuickAction } from "@/modules/catalog/server/catalog-actions";

interface ItemRow {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  purchaseQuantity: string;
  stockUnit: string;
  baseUnitCost: string;
  conversionFactor: string;
  usageQuantity: string;
  usageUnit: string;
  usagePrice: string;
  supplierName: string;
  supplierCount: number;
  active: boolean;
  updatedAt: string;
  description?: string;
}

interface ItemsListingViewProps {
  items: ItemRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  query: string;
  type: string;
  status: string;
  category: string;
  categoryOptions: Array<{ value: string; label: string }>;
  sort?: string;
  order?: string;
}

const TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  insumo:        { bg: "#EAF3DE", text: "#27500A" },
  intermediario: { bg: "#E6F1FB", text: "#0C447C" },
  embalagem:     { bg: "#FAEEDA", text: "#633806" },
  prato:         { bg: "#EEEDFE", text: "#3C3489" },
  porcao:        { bg: "#EEEDFE", text: "#3C3489" },
  pre_preparo:   { bg: "#E6F1FB", text: "#0C447C" },
  apoio:         { bg: "#F1EFE8", text: "#444441" },
};

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  ativo:   { bg: "#EAF3DE", text: "#27500A" },
  inativo: { bg: "#F1EFE8", text: "#444441" },
};

const typeOptions = [
  { value: "all", label: "Todos os tipos" },
  { value: "insumo", label: "Insumo" },
  { value: "intermediario", label: "Intermediario" },
  { value: "embalagem", label: "Embalagem" },
  { value: "prato", label: "Prato" },
  { value: "porcao", label: "Porcao" },
  { value: "pre_preparo", label: "Pre-preparo" },
  { value: "apoio", label: "Apoio" }
];

const statusOptions = [
  { value: "all", label: "Todos os status" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" }
];

type SortableField = "code" | "name" | "type" | "category" | "purchaseQuantity" | "stockUnit" | "baseUnitCost" | "conversionFactor" | "usageQuantity" | "usageUnit" | "usagePrice" | "supplierName" | "active" | "updatedAt";

interface ColumnDef {
  field: string;
  header: string;
  className: string;
  align?: "left" | "right" | "center";
  sortable?: SortableField;
  width: number;
}

const COLUMNS: ColumnDef[] = [
  { field: "code",             header: "Codigo",           className: "c-cod",   width: 72,  sortable: "code" },
  { field: "name",             header: "Nome do Item",     className: "c-nome",  width: 200, sortable: "name" },
  { field: "type",             header: "Tipo",             className: "c-tipo",  width: 92,  sortable: "type" },
  { field: "category",         header: "Categoria",        className: "c-cat",   width: 102, sortable: "category" },
  { field: "purchaseQuantity", header: "Qtde Compra",      className: "c-qtdc",  width: 72,  align: "right", sortable: "purchaseQuantity" },
  { field: "stockUnit",        header: "Un. Compra",       className: "c-unc",   width: 54,  sortable: "stockUnit" },
  { field: "baseUnitCost",     header: "Preco Compra",     className: "c-precc", width: 90,  align: "right", sortable: "baseUnitCost" },
  { field: "conversionFactor", header: "Fator Conv.",      className: "c-fator", width: 62,  align: "right", sortable: "conversionFactor" },
  { field: "usageQuantity",    header: "Qtde Uso",         className: "c-qtdu",  width: 64,  align: "right", sortable: "usageQuantity" },
  { field: "usageUnit",        header: "Un. Uso",          className: "c-unu",   width: 50,  sortable: "usageUnit" },
  { field: "usagePrice",       header: "Preco Uso",        className: "c-precu", width: 74,  align: "right", sortable: "usagePrice" },
  { field: "supplierName",     header: "Fornecedor",       className: "c-forn",  width: 114, sortable: "supplierName" },
  { field: "active",           header: "Status",           className: "c-sta",   width: 64,  align: "center", sortable: "active" },
  { field: "updatedAt",        header: "Ult. Atualizacao", className: "c-data",  width: 92,  sortable: "updatedAt" },
  { field: "description",      header: "Obs",              className: "c-obs",   width: 40,  align: "center" }
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function formatCurrency(value: string | null | undefined) {
  if (value === "--") {
    return "--";
  }
  const num = Number(value);
  if (!value || !Number.isFinite(num) || num === 0) {
    return "—";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

function formatDecimal(value: string | null | undefined) {
  if (value === "--") {
    return "--";
  }
  const num = Number(value);
  if (!value || !Number.isFinite(num) || num === 0) {
    return "—";
  }
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(num);
}

function formatDateShort(isoString: string | null | undefined) {
  if (!isoString) {
    return "—";
  }
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

function capitalizeLabel(value: string | null | undefined) {
  const raw = (value ?? "").replaceAll("_", " ");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function DesktopNewItemAction() {
  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up("sm"));

  if (!smUp) {
    return null;
  }

  return (
    <Button
      component={Link}
      href="/itens/novo"
      variant="contained"
      startIcon={<AddIcon />}
    >
      Novo item
    </Button>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors = TYPE_BADGE_COLORS[type] ?? { bg: "#F1EFE8", text: "#444441" };
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10,
        padding: "2px 7px",
        borderRadius: 4,
        fontWeight: 500,
        whiteSpace: "nowrap",
        background: colors.bg,
        color: colors.text
      }}
    >
      {capitalizeLabel(type)}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const colors = STATUS_BADGE_COLORS[active ? "ativo" : "inativo"];
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10,
        padding: "2px 7px",
        borderRadius: 4,
        fontWeight: 500,
        background: colors.bg,
        color: colors.text
      }}
    >
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

function SupplierCell({ row }: { row: ItemRow }) {
  if (!row.supplierName) {
    return <span style={{ color: "#888780", fontSize: 11 }}>{"—"}</span>;
  }
  if (row.supplierName === "--") {
    return <span style={{ fontSize: 11, color: "#5F5E5A" }}>--</span>;
  }
  const extras = Math.max(0, row.supplierCount - 1);
  if (extras > 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          overflow: "hidden"
        }}
      >
        <span
          title={row.supplierName}
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 11,
            color: "#5F5E5A"
          }}
        >
          {row.supplierName}
        </span>
        <span
          style={{
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 600,
            background: "#E6F1FB",
            color: "#185FA5",
            borderRadius: 4,
            padding: "1px 5px",
            whiteSpace: "nowrap"
          }}
        >
          +{extras}
        </span>
      </div>
    );
  }
  return (
    <span
      title={row.supplierName}
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontSize: 11,
        color: "#5F5E5A",
        display: "block"
      }}
    >
      {row.supplierName}
    </span>
  );
}

function ObservationCell({ description }: { description?: string }) {
  if (!description) {
    return <span style={{ color: "#888780" }}>{"—"}</span>;
  }
  return (
    <Tooltip title="Ver observacao">
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#185FA5"
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 14 }} />
      </span>
    </Tooltip>
  );
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface InlineEditCellProps {
  value: string;
  displayValue: string;
  onSave: (next: string) => Promise<void>;
  align?: "left" | "right";
  inputStyle?: CSSProperties;
  formatForEdit?: (v: string) => string;
  children: ReactNode;
}

function InlineEditCell({ value, onSave, align = "left", inputStyle, formatForEdit, children }: InlineEditCellProps) {
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
    setDraft(formatForEdit ? formatForEdit(value) : value);
    setSaveStatus("idle");
    setEditing(true);
  }, [value, formatForEdit]);

  const commitEdit = useCallback(async () => {
    const trimmed = draft.trim();
    const baseline = formatForEdit ? formatForEdit(value).trim() : value.trim();
    if (trimmed === baseline) {
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
        role="gridcell"
        style={{ padding: "4px 7px", verticalAlign: "middle" }}
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
              background: "#fff",
              ...inputStyle
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
      role="gridcell"
      style={{ padding: "8px 7px", verticalAlign: "middle", cursor: "text" }}
      onClick={startEdit}
      title="Clique para editar"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {children}
        {saveStatus === "saved" && (
          <span style={{ fontSize: 10, color: "#1B6B2C", whiteSpace: "nowrap" }}>Salvo ✓</span>
        )}
        {saveStatus === "error" && (
          <span style={{ fontSize: 10, color: "#A32D2D", whiteSpace: "nowrap" }}>Erro</span>
        )}
      </div>
    </td>
  );
}

export function ItemsListingView({
  items,
  page,
  pageSize,
  totalCount,
  query,
  type,
  status,
  category,
  categoryOptions,
  sort,
  order
}: ItemsListingViewProps) {
  const router = useRouter();
  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up("sm"));
  const [queryValue, setQueryValue] = useState(query);
  const [typeValue, setTypeValue] = useState(type);
  const [statusValue, setStatusValue] = useState(status);
  const [categoryValue, setCategoryValue] = useState(category);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQueryValue(query);
    setTypeValue(type);
    setStatusValue(status);
    setCategoryValue(category);
  }, [query, type, status, category]);

  function buildHref(next: {
    query?: string;
    type?: string;
    status?: string;
    category?: string;
    page?: number;
    pageSize?: number;
    sort?: string | null;
    order?: string | null;
  }) {
    const params = new URLSearchParams();
    const nextQuery = next.query ?? queryValue;
    const nextType = next.type ?? typeValue;
    const nextStatus = next.status ?? statusValue;
    const nextCategory = next.category ?? categoryValue;
    const nextPage = next.page ?? page;
    const nextPageSize = next.pageSize ?? pageSize;
    const nextSort = next.sort === null ? undefined : (next.sort ?? sort);
    const nextOrder = next.order === null ? undefined : (next.order ?? order);

    if (nextQuery.trim()) {
      params.set("query", nextQuery.trim());
    }

    if (nextType !== "all") {
      params.set("type", nextType);
    }

    if (nextStatus !== "all") {
      params.set("status", nextStatus);
    }

    if (nextCategory !== "all") {
      params.set("category", nextCategory);
    }

    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }

    if (nextPageSize !== 100) {
      params.set("pageSize", String(nextPageSize));
    }

    if (nextSort) {
      params.set("sort", nextSort);
    }

    if (nextOrder) {
      params.set("order", nextOrder);
    }

    const search = params.toString();
    return search ? `/itens?${search}` : "/itens";
  }

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

  const allCategoryOptions = useMemo(
    () => [{ value: "all", label: "Todas as categorias" }, ...categoryOptions],
    [categoryOptions]
  );

  function handleSortClick(field: SortableField) {
    if (sort === field) {
      if (order === "asc") {
        router.push(buildHref({ page: 1, sort: field, order: "desc" }) as never);
      } else {
        router.push(buildHref({ page: 1, sort: null, order: null }) as never);
      }
    } else {
      router.push(buildHref({ page: 1, sort: field, order: "asc" }) as never);
    }
  }

  const categoryLabel = (value: string) => {
    if (!value || value === "sem categoria") {
      return "—";
    }
    return value;
  };

  return (
    <Stack spacing="16px">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: "10px" }}
        alignItems={{ sm: "center" }}
      >
        <FlatSearchInput
          value={queryValue}
          onChange={(next) => setQueryValue(next)}
          placeholder="Buscar por nome..."
          ariaLabel="Buscar por nome"
          name="query"
        />

        <FlatSelect
          value={typeValue}
          onChange={(next) => {
            setTypeValue(next);
            navigateImmediate({ type: next });
          }}
          options={typeOptions}
          ariaLabel="Tipo"
          name="type"
        />

        <FlatSelect
          value={categoryValue}
          onChange={(next) => {
            setCategoryValue(next);
            navigateImmediate({ category: next });
          }}
          options={allCategoryOptions}
          ariaLabel="Categoria Operacional"
          name="category"
        />

        <FlatSelect
          value={statusValue}
          onChange={(next) => {
            setStatusValue(next);
            navigateImmediate({ status: next });
          }}
          options={statusOptions}
          ariaLabel="Status"
          name="status"
        />
      </Stack>

      <Box
        sx={{
          background: "#fff",
          border: "0.5px solid #D3D1C7",
          borderRadius: "10px",
          overflow: "hidden"
        }}
      >
        <Box sx={{ padding: "10px 16px", borderBottom: "0.5px solid #D3D1C7" }}>
          <Typography
            component="div"
            sx={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#888780",
              textTransform: "uppercase"
            }}
          >
            Cadastro Mestre
          </Typography>
          <Typography
            component="div"
            sx={{ fontSize: 11, color: "#888780", marginTop: "2px" }}
          >
            {totalCount} itens encontrados
          </Typography>
        </Box>

        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <ItemsTable
            items={items}
            sortField={sort as SortableField | undefined}
            sortOrder={order as "asc" | "desc" | undefined}
            onSort={handleSortClick}
            onRowClick={(row) => router.push(`/itens/${row.id}` as never)}
            categoryLabel={categoryLabel}
          />
        </Box>

        <ListingPagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          itemsNoun="itens"
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={(nextPage) =>
            router.push(buildHref({ page: nextPage, pageSize }) as never)
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
          href="/itens/novo"
          aria-label="Novo item"
          sx={{
            position: "fixed",
            right: 16,
            bottom: 24,
            zIndex: (theme) => theme.zIndex.appBar
          }}
        >
          <AddIcon />
        </Fab>
      ) : null}
    </Stack>
  );
}

interface ItemsTableProps {
  items: ItemRow[];
  sortField?: SortableField;
  sortOrder?: "asc" | "desc";
  onSort: (field: SortableField) => void;
  onRowClick: (row: ItemRow) => void;
  categoryLabel: (value: string) => string;
}

function ItemsTable({ items, sortField, sortOrder, onSort, onRowClick, categoryLabel }: ItemsTableProps) {
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);
  const thBase: CSSProperties = {
    padding: "8px 7px",
    fontSize: 10,
    fontWeight: 600,
    color: "#888780",
    textAlign: "left",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    userSelect: "none",
    background: "#F4F4F2",
    borderBottom: "0.5px solid #D3D1C7"
  };

  const tdBase: CSSProperties = {
    padding: "8px 7px",
    fontSize: 12,
    color: "#2C2C2A",
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  };

  if (items.length === 0) {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          {COLUMNS.map((col) => (
            <col key={col.field} style={{ width: `${col.width}px` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.field}
                style={{
                  ...thBase,
                  textAlign: col.align ?? "left",
                  cursor: col.sortable ? "pointer" : "default"
                }}
              >
                {col.header}
                {col.sortable && (
                  <svg width="8" height="10" viewBox="0 0 8 10" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginLeft: 3, verticalAlign: "middle" }}>
                    <path d="M4 1L1.5 4H6.5L4 1Z" fill="#C8C6BE" />
                    <path d="M4 9L6.5 6H1.5L4 9Z" fill="#C8C6BE" />
                  </svg>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              colSpan={COLUMNS.length}
              style={{
                textAlign: "center",
                padding: "32px",
                color: "#888780",
                fontSize: 13
              }}
            >
              Nenhum item encontrado. Tente ajustar os filtros.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table
      role="grid"
      data-testid="items-table"
      style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
    >
      <colgroup>
        {COLUMNS.map((col) => (
          <col key={col.field} style={{ width: `${col.width}px` }} />
        ))}
      </colgroup>
      <thead data-testid="column-headers">
        <tr>
          {COLUMNS.map((col) => {
            const isActive = col.sortable && sortField === col.sortable;
            const isHovered = hoveredCol === col.field && !!col.sortable;
            const headerStyle: CSSProperties = {
              ...thBase,
              textAlign: col.align ?? "left",
              cursor: col.sortable ? "pointer" : "default",
              color: isActive ? "#185FA5" : thBase.color,
              background: isHovered ? "#EAEAE8" : "#F4F4F2"
            };
            return (
              <th
                key={col.field}
                style={headerStyle}
                onClick={() => col.sortable && onSort(col.sortable)}
                onMouseEnter={() => col.sortable && setHoveredCol(col.field)}
                onMouseLeave={() => setHoveredCol(null)}
                aria-sort={isActive ? (sortOrder === "desc" ? "descending" : "ascending") : "none"}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, justifyContent: col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start" }}>
                  {col.header}
                  {col.sortable && (
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
                        fill={isActive && sortOrder === "asc" ? "#185FA5" : "#C8C6BE"}
                      />
                      <path
                        d="M4 9L6.5 6H1.5L4 9Z"
                        fill={isActive && sortOrder === "desc" ? "#185FA5" : "#C8C6BE"}
                      />
                    </svg>
                  )}
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {items.map((row) => (
          <ItemRowView
            key={row.id}
            row={row}
            tdBase={tdBase}
            onClick={() => onRowClick(row)}
            categoryLabel={categoryLabel}
          />
        ))}
      </tbody>
    </table>
  );
}

interface ItemRowViewProps {
  row: ItemRow;
  tdBase: CSSProperties;
  onClick: () => void;
  categoryLabel: (value: string) => string;
}

function ItemRowView({ row, tdBase, onClick, categoryLabel }: ItemRowViewProps) {
  const [hover, setHover] = useState(false);
  const [localName, setLocalName] = useState(row.name);
  const [localCost, setLocalCost] = useState(row.baseUnitCost);

  const rowStyle: CSSProperties = {
    borderBottom: "0.5px solid #D3D1C7",
    cursor: "pointer",
    background: hover ? "#F7F7F5" : "transparent",
    transition: "background .1s"
  };

  const mutedStyle: CSSProperties = { ...tdBase, color: "#888780", fontSize: 11 };
  const rightStyle: CSSProperties = { ...tdBase, textAlign: "right" };
  const rightMuted: CSSProperties = { ...mutedStyle, textAlign: "right" };
  const centerStyle: CSSProperties = { ...tdBase, textAlign: "center" };

  const handleSaveName = useCallback(async (next: string) => {
    if (!next) throw new Error("Nome não pode estar vazio.");
    const result = await patchItemQuickAction({ itemId: row.id, name: next });
    if (!result.ok) throw new Error(result.message ?? "Erro ao salvar.");
    setLocalName(next);
  }, [row.id]);

  const handleSaveCost = useCallback(async (next: string) => {
    const num = Number(next.replace(",", "."));
    if (!Number.isFinite(num) || num < 0) throw new Error("Valor inválido.");
    const result = await patchItemQuickAction({ itemId: row.id, purchaseCost: String(num) });
    if (!result.ok) throw new Error(result.message ?? "Erro ao salvar.");
    setLocalCost(String(num));
  }, [row.id]);

  return (
    <tr
      role="row"
      style={rowStyle}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <td role="gridcell" data-field="code" style={tdBase}>
        <span style={{ fontSize: 11, color: "#185FA5" }}>{row.code}</span>
      </td>
      <InlineEditCell
        value={localName}
        displayValue={localName}
        onSave={handleSaveName}
      >
        <span
          style={{
            fontWeight: 500,
            fontSize: 13,
            color: "#2C2C2A"
          }}
        >
          {localName}
        </span>
      </InlineEditCell>
      <td role="gridcell" data-field="type" style={tdBase}>
        <TypeBadge type={row.type} />
      </td>
      <td role="gridcell" data-field="category" style={mutedStyle} title={row.category}>
        {categoryLabel(row.category)}
      </td>
      <td role="gridcell" data-field="purchaseQuantity" style={rightStyle}>
        {formatDecimal(row.purchaseQuantity)}
      </td>
      <td role="gridcell" data-field="stockUnit" style={mutedStyle}>
        {row.stockUnit || "—"}
      </td>
      <InlineEditCell
        value={localCost === "—" || localCost === "--" ? "" : localCost}
        displayValue={localCost}
        onSave={handleSaveCost}
        align="right"
        formatForEdit={(v) => {
          const n = Number(v);
          return Number.isFinite(n) && v !== ""
            ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : v;
        }}
      >
        <span style={{ fontSize: 12, color: "#2C2C2A", textAlign: "right", display: "block", width: "100%" }}>
          {formatCurrency(localCost)}
        </span>
      </InlineEditCell>
      <td role="gridcell" data-field="conversionFactor" style={rightStyle}>
        {formatDecimal(row.conversionFactor)}
      </td>
      <td role="gridcell" data-field="usageQuantity" style={rightStyle}>
        {formatDecimal(row.usageQuantity)}
      </td>
      <td role="gridcell" data-field="usageUnit" style={mutedStyle}>
        {row.usageUnit || "—"}
      </td>
      <td role="gridcell" data-field="usagePrice" style={{ ...rightStyle, color: "#1B6B2C", fontWeight: 500 }}>
        {formatCurrency(row.usagePrice)}
      </td>
      <td role="gridcell" data-field="supplierName" style={tdBase}>
        <SupplierCell row={row} />
      </td>
      <td role="gridcell" data-field="active" style={centerStyle}>
        <StatusBadge active={row.active} />
      </td>
      <td role="gridcell" data-field="updatedAt" style={{ ...rightMuted, textAlign: "left" }}>
        {formatDateShort(row.updatedAt)}
      </td>
      <td role="gridcell" data-field="description" style={centerStyle}>
        <ObservationCell description={row.description} />
      </td>
    </tr>
  );
}

