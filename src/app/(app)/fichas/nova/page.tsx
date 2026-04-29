import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import { getEngineeringRepository } from "@/modules/engineering/server/engineering-repository";
import { FichaForm } from "@/modules/engineering/ui/ficha-form";
import { getMasterDataRepository } from "@/modules/master-data/server/master-data-repository";
import { PageHeader } from "@/modules/platform/ui/page-header";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingle(searchParam: string | string[] | undefined, fallback = "") {
  return Array.isArray(searchParam) ? searchParam[0] ?? fallback : searchParam ?? fallback;
}

export default async function NewFichaPage({ searchParams }: { searchParams?: SearchParams }) {
  const [itemOptions, modalityOptions, stageTypes, units] = await Promise.all([
    getCatalogRepository().listItemOptions(),
    getEngineeringRepository().listModalities(),
    getMasterDataRepository().listStageTypes(),
    getMasterDataRepository().listUnits()
  ]);

  // Quick 20260424 item 3: deriva lista de codigos de unidade ativos para o select Unidade.
  const unitOptions = units.filter((u) => u.active).map((u) => u.code);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const scope = getSingle(resolvedSearchParams.scope);
  const filteredItemOptions =
    scope === "finais"
      ? itemOptions.filter((item) => ["prato", "porcao", "marmita", "combo"].includes(item.type))
      : itemOptions;
  const baseItem = filteredItemOptions[0] ?? itemOptions[0];
  const formId = "new-ficha-form";

  return (
    <Box sx={{ pb: { xs: 12, sm: 0 } }}>
      <PageHeader
        size="compact"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Fichas Tecnicas", href: "/fichas" },
          { label: "Nova ficha" }
        ]}
        title="Criar ficha tecnica"
        description="Layout para pratos, porcoes, marmitas e combos."
        actions={
          /* Phase 09-04 D-06: Salvar ficha hex tokens HTML linhas 39-41. */
          <Button
            type="submit"
            form={formId}
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            sx={{
              display: { xs: "none", sm: "inline-flex" },
              padding: '7px 16px',
              backgroundColor: '#185FA5',
              borderColor: '#185FA5',
              color: '#fff',
              '&:hover': { backgroundColor: '#0C447C' }
            }}
          >
            Salvar ficha
          </Button>
        }
      />

      <FichaForm
        formId={formId}
        itemOptions={filteredItemOptions}
        componentOptions={itemOptions}
        modalityOptions={modalityOptions}
        unitOptions={unitOptions}
        stageTypeOptions={stageTypes.map((stageType) => ({
          id: stageType.id,
          code: stageType.code,
          label: stageType.name
        }))}
        initialValues={{
          itemId: baseItem?.id ?? "",
          itemName: baseItem?.name ?? "",
          itemType: baseItem?.type ?? "pre_preparo",
          modality: {
            id: modalityOptions[0]?.id ?? "",
            label: modalityOptions[0]?.label ?? ""
          },
          status: "rascunho",
          yieldMode: "percentual_perda",
          percentLoss: "0.1000",
          finalWeight: "",
          portions: "1.0000",
          preparationMode: "",
          notes: "",
          summary: {
            totalGross: "0.0000",
            totalNet: "0.0000",
            postCookingWeight: "--",
            cookingFactorGross: null,
            cookingFactorNet: null,
            totalInputCost: "0.0000",
            costWithoutPackagingPerKg: null,
            cmvPerKg: "--",
            packagingCost: "0.0000",
            salePrice: "--",
            variableExpensePercent: "--",
            contributionMarginValue: "--",
            contributionMarginPercent: "--",
            mealCmv: "--",
            packagingShareOnCmv: "--",
            costReal: "0.0000",
            preparationModePreview: ""
          },
          stages: [
            {
              id: "stage-1",
              name: "Etapa 1",
              stageTypeId: stageTypes[0]?.id ?? "",
              stageTypeCode: stageTypes[0]?.code ?? "limpeza_pre_preparo",
              stageTypeLabel: stageTypes[0]?.name ?? "Limpeza / Pre-Preparo",
              outputQuantity: "",
              correctionFactor: "",
              cookingIndex: "",
              notes: "",
              items: []
            }
          ]
        }}
      />

      <StickyActionBar>
        {/* Phase 09-04 D-06: mesmos tokens do Salvar ficha no topbar. */}
        <Button
          type="submit"
          form={formId}
          fullWidth
          variant="contained"
          startIcon={<SaveOutlinedIcon />}
          sx={{
            padding: '7px 16px',
            backgroundColor: '#185FA5',
            borderColor: '#185FA5',
            color: '#fff',
            '&:hover': { backgroundColor: '#0C447C' }
          }}
        >
          Salvar ficha
        </Button>
      </StickyActionBar>
    </Box>
  );
}
