"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type SortableField = "name" | "baseUnitCost" | "usagePrice" | "updatedAt";
type SortDirection = "asc" | "desc";
type SortState = { field: SortableField; order: SortDirection } | null;

interface ColumnDef {
  field: string;
  header: string;
  className: string;
  align?: "left" | "right" | "center";
  sortable?: SortableField;
  width: number;
}

const COLUMNS: ColumnDef[] = [
  { field: "code", header: "Codigo", className: "c-cod", width: 72 },
  { field: "name", header: "Nome do Item", className: "c-nome", width: 162, sortable: "name" },
  { field: "type", header: "Tipo", className: "c-tipo", width: 92 },
  { field: "category", header: "Categoria", className: "c-cat", width: 102 },
  { field: "purchaseQuantity", header: "Qtde Compra", className: "c-qtdc", width: 72, align: "right" },
  { field: "stockUnit", header: "Un. Compra", className: "c-unc", width: 54 },
  { field: "baseUnitCost", header: "Preco Compra", className: "c-precc", width: 74, align: "right", sortable: "baseUnitCost" },
  { field: "conversionFactor", header: "Fator Conv.", className: "c-fator", width: 62, align: "right" },
  { field: "usageQuantity", header: "Qtde Uso", className: "c-qtdu", width: 64, align: "right" },
  { field: "usageUnit", header: "Un. Uso", className: "c-unu", width: 50 },
  { field: "usagePrice", header: "Preco Uso", className: "c-precu", width: 74, align: "right", sortable: "usagePrice" },
  { field: "supplierName", header: "Fornecedor", className: "c-forn", width: 114 },
  { field: "active", header: "Status", className: "c-sta", width: 64, align: "center" },
  { field: "updatedAt", header: "Ult. Atualizacao", className: "c-data", width: 92, sortable: "updatedAt" },
  { field: "description", header: "Obs", className: "c-obs", width: 40, align: "center" }
];

function formatCurrency(value: string | null | undefined) {
  if (value === "--") {
    return "--";
  }
  const num = Number(value);
  if (!value || !Number.isFinite(num) || num === 0) {
    return "\u2014";
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
    return "\u2014";
  }
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(num);
}

function formatDateShort(isoString: string | null | undefined) {
  if (!isoString) {
    return "\u2014";
  }
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    return "\u2014";
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
    return <span style={{ color: "#888780", fontSize: 11 }}>{"\u2014"}</span>;
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
    return <span style={{ color: "#888780" }}>{"\u2014"}</span>;
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

export function ItemsListingView({
  items,
  page,
  pageSize,
  totalCount,
  query,
  type,
  status,
  category,
  categoryOptions
}: ItemsListingViewProps) {
  const router = useRouter();
  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up("sm"));
  const [queryValue, setQueryValue] = useState(query);
  const [typeValue, setTypeValue] = useState(type);
  const [statusValue, setStatusValue] = useState(status);
  const [categoryValue, setCategoryValue] = useState(category);
  const [sortState, setSortState] = useState<SortState>({ field: "name", order: "asc" });
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
    sort?: string;
    order?: string;
  }) {
    const params = new URLSearchParams();
    const nextQuery = next.query ?? queryValue;
    const nextType = next.type ?? typeValue;
    const nextStatus = next.status ?? statusValue;
    const nextCategory = next.category ?? categoryValue;
    const nextPage = next.page ?? page;
    const nextPageSize = next.pageSize ?? pageSize;

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

    if (nextPageSize !== 10) {
      params.set("pageSize", String(nextPageSize));
    }

    if (next.sort) {
      params.set("sort", next.sort);
    }

    if (next.order) {
      params.set("order", next.order);
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

  function toggleSort(field: SortableField) {
    const nextOrder: SortDirection =
      sortState?.field === field && sortState.order === "asc" ? "desc" : "asc";
    setSortState({ field, order: nextOrder });
    navigateImmediate({ sort: field, order: nextOrder });
  }

  const categoryLabel = (value: string) => {
    if (!value || value === "sem categoria") {
      return "\u2014";
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
            sortState={sortState}
            onSort={toggleSort}
            onRowClick={(row) => router.push(`/itens/${row.id}` as never)}
            categoryLabel={categoryLabel}
          />
        </Box>

        <ListingPagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          itemsNoun="itens"
          onPageChange={(nextPage) =>
            router.push(buildHref({ page: nextPage, pageSize }) as never)
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
  sortState: SortState;
  onSort: (field: SortableField) => void;
  onRowClick: (row: ItemRow) => void;
  categoryLabel: (value: string) => string;
}

function ItemsTable({ items, sortState, onSort, onRowClick, categoryLabel }: ItemsTableProps) {
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
                data-field={col.field}
                data-sortable={String(Boolean(col.sortable))}
                data-width={String(col.width)}
                data-flex=""
              >
                {col.header}
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
            const isSorted = col.sortable && sortState?.field === col.sortable;
            const arrow = isSorted ? (sortState?.order === "asc" ? " \u25B2" : " \u25BC") : "";
            const headerStyle: CSSProperties = {
              ...thBase,
              textAlign: col.align ?? "left",
              cursor: col.sortable ? "pointer" : "default",
              color: isSorted ? "#185FA5" : thBase.color
            };
            return (
              <th
                key={col.field}
                style={headerStyle}
                onClick={() => col.sortable && onSort(col.sortable)}
                data-field={col.field}
                data-sortable={String(Boolean(col.sortable))}
                data-width={String(col.width)}
                data-flex=""
              >
                {col.header}
                {arrow ? (
                  <span style={{ fontSize: 8, color: "#185FA5" }}>{arrow}</span>
                ) : null}
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

  return (
    <tr
      role="row"
      style={rowStyle}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <CellView style={tdBase} field="code">
        <span style={{ fontSize: 11, color: "#185FA5" }}>{row.code}</span>
      </CellView>
      <CellView style={tdBase} field="name">
        <span
          title={row.name}
          style={{
            fontWeight: 500,
            fontSize: 13,
            color: "#2C2C2A",
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {row.name}
        </span>
      </CellView>
      <CellView style={tdBase} field="type">
        <TypeBadge type={row.type} />
      </CellView>
      <CellView style={mutedStyle} field="category" title={row.category}>
        {categoryLabel(row.category)}
      </CellView>
      <CellView style={rightStyle} field="purchaseQuantity">
        {formatDecimal(row.purchaseQuantity)}
      </CellView>
      <CellView style={mutedStyle} field="stockUnit">
        {row.stockUnit || "\u2014"}
      </CellView>
      <CellView style={rightStyle} field="baseUnitCost">
        {formatCurrency(row.baseUnitCost)}
      </CellView>
      <CellView style={rightStyle} field="conversionFactor">
        {formatDecimal(row.conversionFactor)}
      </CellView>
      <CellView style={rightStyle} field="usageQuantity">
        {formatDecimal(row.usageQuantity)}
      </CellView>
      <CellView style={mutedStyle} field="usageUnit">
        {row.usageUnit || "\u2014"}
      </CellView>
      <CellView
        style={{ ...rightStyle, color: "#1B6B2C", fontWeight: 500 }}
        field="usagePrice"
      >
        {formatCurrency(row.usagePrice)}
      </CellView>
      <CellView style={tdBase} field="supplierName">
        <SupplierCell row={row} />
      </CellView>
      <CellView style={centerStyle} field="active">
        <StatusBadge active={row.active} />
      </CellView>
      <CellView style={rightMuted} field="updatedAt" textAlign="left">
        {formatDateShort(row.updatedAt)}
      </CellView>
      <CellView style={centerStyle} field="description">
        <ObservationCell description={row.description} />
      </CellView>
    </tr>
  );
}

interface CellViewProps {
  style: CSSProperties;
  field: string;
  title?: string;
  textAlign?: "left" | "right" | "center";
  children: ReactNode;
}

function CellView({ style, field, title, textAlign, children }: CellViewProps) {
  const finalStyle: CSSProperties = textAlign ? { ...style, textAlign } : style;
  return (
    <td role="gridcell" data-field={field} style={finalStyle} title={title}>
      {children}
    </td>
  );
}
