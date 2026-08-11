import { notFound } from "next/navigation";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { getMasterDataRepository } from "@/modules/master-data/server/master-data-repository";
import { saveMasterDataAction, deleteMasterDataAction } from "@/modules/master-data/server/master-data-actions";
import { UpdateRowForm } from "@/components/ui/UpdateRowForm";
import { PageHeader } from "@/modules/platform/ui/page-header";

type SearchParams = Promise<{
  saved?: string;
  deleted?: string;
  error?: string;
}>;

type CodeMode = "none" | "text" | "text-readonly" | "select-item-type" | "select-stage-type";

interface KindConfig {
  title: string;
  dbKind: string;
  desc: string;
  codeMode: CodeMode;
  codePlaceholder?: string;
  hasMeasureType?: boolean;
  usageLabel: string;
}

const KIND_MAPPING: Record<string, KindConfig> = {
  fornecedores: {
    title: "Fornecedores",
    dbKind: "supplier",
    desc: "Fornecedores usados nas referências de compra dos itens.",
    codeMode: "none",
    usageLabel: "compras"
  },
  unidades: {
    title: "Unidades",
    dbKind: "unit",
    desc: "Unidades de compra, estoque e uso (ex: kg, L, un).",
    codeMode: "text",
    codePlaceholder: "ex: un",
    hasMeasureType: true,
    usageLabel: "compras"
  },
  categorias: {
    title: "Categorias Operacionais",
    dbKind: "operational-category",
    desc: "Categorias de agrupamento de insumos.",
    codeMode: "text-readonly",
    usageLabel: "itens"
  },
  grupos: {
    title: "Grupos Operacionais",
    dbKind: "operational-category",
    desc: "Grupos operacionais de fichas técnicas.",
    codeMode: "text-readonly",
    usageLabel: "itens"
  },
  modalidades: {
    title: "Modalidades",
    dbKind: "modality",
    desc: "Modalidades selecionadas diretamente na ficha técnica.",
    codeMode: "text",
    codePlaceholder: "ex: delivery",
    usageLabel: "fichas"
  },
  "tipos-item": {
    title: "Tipos de Item",
    dbKind: "item-type",
    desc: "Nomenclatura dos tipos canônicos (insumo, preparo...).",
    codeMode: "select-item-type",
    usageLabel: "itens"
  },
  "tipos-etapa": {
    title: "Tipos de Etapa",
    dbKind: "stage-type",
    desc: "Tipos de etapas de preparação e cálculo (governam FC/IC).",
    codeMode: "select-stage-type",
    usageLabel: "etapas"
  }
};

const ITEM_TYPE_OPTIONS = [
  "insumo", "pre_preparo", "intermediario", "produto_pronto",
  "prato", "porcao", "marmita", "combo", "embalagem", "apoio"
];

const STAGE_TYPE_OPTIONS = [
  { value: "limpeza_pre_preparo", label: "Limpeza / Pré-Preparo" },
  { value: "coccao_preparo", label: "Cocção / Preparo" },
  { value: "montagem", label: "Montagem" }
];

const inputSx = {
  "& .MuiInputBase-root": { bgcolor: "#fff" }
} as const;

// Ultima coluna (56px) e dedicada so ao botao de excluir, que vive num <form>
// separado do de salvar — precisa de uma coluna propria pro grid auto-placement
// nao empurrar o botao pra uma nova linha.
function GridColumns({ config }: { config: KindConfig }) {
  const codeWidth = config.codeMode !== "none" ? "140px " : "";
  const measureWidth = config.hasMeasureType ? "150px " : "";
  return { columns: `${codeWidth}1fr ${measureWidth}110px 150px 90px 56px` };
}

function CodeField({
  config,
  defaultValue
}: {
  config: KindConfig;
  defaultValue?: string;
}) {
  if (config.codeMode === "none") return null;

  if (config.codeMode === "select-item-type") {
    return (
      <TextField select size="small" name="code" defaultValue={defaultValue ?? "insumo"} sx={inputSx} fullWidth>
        {ITEM_TYPE_OPTIONS.map((o) => (
          <MenuItem key={o} value={o}>
            {o}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (config.codeMode === "select-stage-type") {
    return (
      <TextField
        select
        size="small"
        name="code"
        defaultValue={defaultValue ?? "limpeza_pre_preparo"}
        sx={inputSx}
        fullWidth
      >
        {STAGE_TYPE_OPTIONS.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <TextField
      size="small"
      name="code"
      defaultValue={defaultValue}
      placeholder={config.codePlaceholder}
      slotProps={{ htmlInput: { readOnly: config.codeMode === "text-readonly" } }}
      sx={config.codeMode === "text-readonly" ? { "& .MuiInputBase-root": { bgcolor: "#F0EFEA" } } : inputSx}
      fullWidth
    />
  );
}

export default async function MasterDataScreen({
  params,
  searchParams
}: {
  params: Promise<{ kind: string }>;
  searchParams?: SearchParams;
}) {
  const p = await params;
  const config = KIND_MAPPING[p.kind];
  if (!config) {
    notFound();
  }

  const sParams = await searchParams;
  const repository = getMasterDataRepository();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any[] = [];
  if (p.kind === "fornecedores") data = await repository.listSuppliers();
  if (p.kind === "unidades") data = await repository.listUnits();
  if (p.kind === "categorias" || p.kind === "grupos") data = await repository.listOperationalCategories();
  if (p.kind === "modalidades") data = await repository.listModalities();
  if (p.kind === "tipos-item") data = await repository.listItemTypes();
  if (p.kind === "tipos-etapa") data = await repository.listStageTypes();

  const activeCount = data.filter((row) => row.active).length;
  const { columns } = GridColumns({ config });
  const redirectUri = `/cadastros/${p.kind}`;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Cadastros", href: "/cadastros" },
          { label: config.title }
        ]}
        title={config.title}
        description={config.desc}
        size="compact"
      />

      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip size="small" label={`${data.length} no total`} sx={{ fontWeight: 600 }} />
          <Chip
            size="small"
            label={`${activeCount} ativo${activeCount === 1 ? "" : "s"}`}
            sx={{ bgcolor: "#EAF3DE", color: "#1B6B2C", fontWeight: 600 }}
          />
          {data.length - activeCount > 0 ? (
            <Chip
              size="small"
              label={`${data.length - activeCount} inativo${data.length - activeCount === 1 ? "" : "s"}`}
              sx={{ bgcolor: "#FBEAEA", color: "#A32D2D", fontWeight: 600 }}
            />
          ) : null}
        </Stack>

        {sParams?.saved ? (
          <Alert severity="success" icon={<CheckCircleRoundedIcon fontSize="small" />}>
            Registro salvo com sucesso.
          </Alert>
        ) : null}
        {sParams?.deleted ? (
          <Alert severity="success" icon={<CheckCircleRoundedIcon fontSize="small" />}>
            Registro removido com sucesso.
          </Alert>
        ) : null}
        {sParams?.error ? (
          <Alert severity="error" icon={<ErrorRoundedIcon fontSize="small" />}>
            {decodeURIComponent(sParams.error)}
          </Alert>
        ) : null}

        <Box
          sx={{
            border: "0.5px solid #D3D1C7",
            borderRadius: 2.5,
            overflow: "hidden",
            bgcolor: "#fff"
          }}
        >
          {/* Cabeçalho */}
          <Box
            sx={{
              display: { xs: "none", md: "grid" },
              gridTemplateColumns: columns,
              gap: 1.5,
              px: 2.5,
              py: 1.25,
              bgcolor: "#F7F5EF",
              borderBottom: "0.5px solid #D3D1C7"
            }}
          >
            {config.codeMode !== "none" ? <ColHeader>Código</ColHeader> : null}
            <ColHeader>Nome</ColHeader>
            {config.hasMeasureType ? <ColHeader>Tipo</ColHeader> : null}
            <ColHeader align="center">Uso</ColHeader>
            <ColHeader align="center">Status</ColHeader>
            <Box sx={{ gridColumn: "span 2" }}>
              <ColHeader align="right">Ações</ColHeader>
            </Box>
          </Box>

          {/* Linha de criação */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: columns },
              gap: 1.5,
              px: 2.5,
              py: 2,
              borderBottom: "0.5px solid #D3D1C7",
              bgcolor: "#F4F8FC"
            }}
          >
            <form action={saveMasterDataAction} style={{ display: "contents" }}>
              <input type="hidden" name="kind" value={config.dbKind} />
              <input type="hidden" name="active" value="true" />
              <input type="hidden" name="redirectUri" value={redirectUri} />

              {config.codeMode !== "none" ? <CodeField config={config} /> : null}

              <TextField
                size="small"
                name="name"
                placeholder="Nome do novo registro..."
                required
                sx={inputSx}
                fullWidth
              />

              {config.hasMeasureType ? (
                <TextField select size="small" name="measureType" defaultValue="massa" sx={inputSx} fullWidth>
                  <MenuItem value="massa">Massa</MenuItem>
                  <MenuItem value="volume">Volume</MenuItem>
                  <MenuItem value="contagem">Contagem</MenuItem>
                </TextField>
              ) : null}

              <Box />
              <Box />

              <Box sx={{ gridColumn: "span 2", display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="small"
                  startIcon={<AddRoundedIcon />}
                  sx={{ backgroundColor: "#185FA5", "&:hover": { backgroundColor: "#0C447C" } }}
                >
                  Adicionar
                </Button>
              </Box>
            </form>
          </Box>

          {/* Linhas de dados */}
          {data.length === 0 ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Nenhum registro cadastrado ainda.
              </Typography>
            </Box>
          ) : (
            data.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: columns },
                  gap: 1.5,
                  px: 2.5,
                  py: 1.5,
                  alignItems: "center",
                  borderBottom: "0.5px solid #EFEDE6",
                  bgcolor: item.active ? "transparent" : "#FDF4F4",
                  "&:last-of-type": { borderBottom: "none" },
                  "&:hover": { bgcolor: item.active ? "#FAFAF8" : "#FCEDED" }
                }}
              >
                <UpdateRowForm
                  action={saveMasterDataAction}
                  itemName={item.name}
                  inUseCount={item.inUseCount}
                  style={{ display: "contents" }}
                >
                  <input type="hidden" name="kind" value={config.dbKind} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="redirectUri" value={redirectUri} />

                  {config.codeMode !== "none" ? <CodeField config={config} defaultValue={item.code} /> : null}

                  <TextField size="small" name="name" defaultValue={item.name} sx={inputSx} fullWidth />

                  {config.hasMeasureType ? (
                    <TextField
                      select
                      size="small"
                      name="measureType"
                      defaultValue={item.measureType ?? "massa"}
                      sx={inputSx}
                      fullWidth
                    >
                      <MenuItem value="massa">Massa</MenuItem>
                      <MenuItem value="volume">Volume</MenuItem>
                      <MenuItem value="contagem">Contagem</MenuItem>
                    </TextField>
                  ) : null}

                  <Box sx={{ textAlign: "center" }}>
                    {item.inUseCount > 0 ? (
                      <Chip
                        size="small"
                        label={`${item.inUseCount} ${config.usageLabel}`}
                        sx={{ bgcolor: "#E6F1FB", color: "#185FA5", fontWeight: 600, fontSize: 11 }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        sem uso
                      </Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        name="active"
                        value="true"
                        defaultChecked={item.active}
                        style={{ width: 16, height: 16, accentColor: "#185FA5", cursor: "pointer" }}
                      />
                    </label>
                    <Chip
                      size="small"
                      label={item.active ? "Ativo" : "Inativo"}
                      sx={
                        item.active
                          ? { bgcolor: "#EAF3DE", color: "#1B6B2C", fontWeight: 600, fontSize: 11 }
                          : { bgcolor: "#FBEAEA", color: "#A32D2D", fontWeight: 600, fontSize: 11 }
                      }
                    />
                  </Stack>

                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button type="submit" size="small" variant="outlined" sx={{ minWidth: 0, px: 1.5, fontSize: 12, whiteSpace: "nowrap" }}>
                      Salvar
                    </Button>
                  </Box>
                </UpdateRowForm>

                <form action={deleteMasterDataAction} style={{ display: "contents" }}>
                  <input type="hidden" name="kind" value={config.dbKind} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="redirectUri" value={redirectUri} />
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <IconButton
                      type="submit"
                      size="small"
                      aria-label={`Excluir ${item.name}`}
                      sx={{ color: "#888780", "&:hover": { color: "#A32D2D", bgcolor: "#FBEAEA" } }}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </form>
              </Box>
            ))
          )}
        </Box>
      </Stack>
    </>
  );
}

function ColHeader({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" | "right" }) {
  return (
    <Typography
      sx={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#888780",
        textAlign: align
      }}
    >
      {children}
    </Typography>
  );
}
