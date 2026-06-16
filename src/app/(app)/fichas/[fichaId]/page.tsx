import { notFound } from "next/navigation";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
import { FormSubmitButton } from "@/modules/platform/ui/form-submit-button";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import { getEngineeringRepository } from "@/modules/engineering/server/engineering-repository";
import { FichaHeaderActions } from "@/modules/engineering/ui/FichaHeaderActions";
import { FichaForm } from "@/modules/engineering/ui/ficha-form";
import { getMasterDataRepository } from "@/modules/master-data/server/master-data-repository";
import { PageHeader } from "@/modules/platform/ui/page-header";
import { requireSession } from "@/modules/access/server/session-cookie";

type Params = Promise<{ fichaId: string }>;

export default async function FichaDetailPage({ params }: { params: Params }) {
  const [{ fichaId }, session] = await Promise.all([params, requireSession()]);
  const [ficha, itemOptions, modalityOptions, stageTypes, units, groupOptionsData] = await Promise.all([
    getEngineeringRepository(session.restaurantId).getFichaDetail(fichaId),
    getCatalogRepository(session.restaurantId).listItemOptions(),
    getEngineeringRepository(session.restaurantId).listModalities(),
    getMasterDataRepository().listStageTypes(),
    getMasterDataRepository().listUnits(),
    getEngineeringRepository(session.restaurantId).listOperationalGroups()
  ]);

  // Quick 20260424 item 3: deriva lista de codigos de unidade ativos para o select Unidade.
  const unitOptions = units.filter((u) => u.active).map((u) => u.code);
  const groupOptions = groupOptionsData.map((g) => g.label);

  if (!ficha) {
    notFound();
  }

  const formId = "edit-ficha-form";
  const hasNotes = ficha.notes.trim().length > 0;

  return (
    <Box sx={{ pb: { xs: 12, sm: 0 } }}>
      <PageHeader
        size="compact"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Fichas Tecnicas", href: "/fichas" },
          { label: ficha.itemName }
        ]}
        title={ficha.itemName}
        description="Edicao da ficha tecnica principal."
        status={ficha.status}
        actions={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
            {hasNotes ? <Chip label="Observacao na ficha" color="secondary" variant="outlined" /> : null}
            <FichaHeaderActions fichaId={ficha.id} />
            {/* Phase 09-04 D-06: Salvar ficha hex tokens HTML linha 41 (.btn + .btn-primary). */}
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
          </Stack>
        }
      />

      <FichaForm
        key={ficha.id}
        formId={formId}
        itemOptions={itemOptions}
        modalityOptions={modalityOptions}
        unitOptions={unitOptions}
        groupOptions={groupOptions}
        stageTypeOptions={stageTypes.map((stageType) => ({
          id: stageType.id,
          code: stageType.code,
          label: stageType.name
        }))}
        initialValues={{
          id: ficha.id,
          code: ficha.code,
          itemId: ficha.itemId,
          itemName: ficha.itemName,
          canonicalItemName: ficha.canonicalItemName,
          displayName: ficha.itemName,
          itemType: ficha.itemType,
          groupOperational: ficha.groupOperational,
          modality: ficha.modality,
          status: ficha.status,
          yieldMode: ficha.yieldMode,
          yieldUnitCode: ficha.yieldUnitCode,
          percentLoss: ficha.percentLoss,
          finalWeight: ficha.finalWeight,
          portions: ficha.portions,
          preparationMode: ficha.preparationMode,
          notes: ficha.notes,
          createdAt: ficha.createdAt,
          updatedAt: ficha.updatedAt,
          createdAtLabel: ficha.createdAtLabel,
          updatedAtLabel: ficha.updatedAtLabel,
          version: ficha.version,
          usageUnit: ficha.usageUnit,
          summary: ficha.sheetSummary,
          stages: ficha.stages
        }}
      >
        <StickyActionBar>
          <FormSubmitButton
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
          </FormSubmitButton>
        </StickyActionBar>
      </FichaForm>
    </Box>
  );
}
