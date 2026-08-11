import { notFound } from "next/navigation";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
import { FormSubmitButton } from "@/modules/platform/ui/form-submit-button";
import { deleteItemAction } from "@/modules/catalog/server/catalog-actions";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import { ItemForm } from "@/modules/catalog/ui/item-form";
import { getMasterDataRepository } from "@/modules/master-data/server/master-data-repository";
import { PageHeader } from "@/modules/platform/ui/page-header";
import { requireSession } from "@/modules/access/server/session-cookie";

type Params = Promise<{ itemId: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function ItemDetailPage({
  params,
  searchParams
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const [{ itemId }, session, resolvedSearchParams] = await Promise.all([
    params,
    requireSession(),
    searchParams ?? Promise.resolve(undefined)
  ]);
  const repository = getCatalogRepository(session.restaurantId);
  const [item, formOptions] = await Promise.all([
    repository.getItemDetail(itemId),
    getMasterDataRepository().getItemFormOptions()
  ]);

  if (!item) {
    notFound();
  }

  const formId = "edit-item-form";
  const deleteError = resolvedSearchParams?.error ? decodeURIComponent(resolvedSearchParams.error) : null;

  return (
    <Box sx={{ pb: { xs: 12, sm: 0 } }}>
      {deleteError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {deleteError}
        </Alert>
      ) : null}

      <PageHeader
        size="compact"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Itens", href: "/itens" },
          { label: item.name }
        ]}
        title={item.name}
        description="Edicao do item mestre."
        status={item.active ? "ativo" : "inativo"}
        actions={
          <Stack direction="row" spacing={1.5}>
            {item.description ? <Chip label="Descricao operacional" color="secondary" variant="outlined" /> : null}
            {/* Phase 09-02 D-14: btn-danger hex tokens — HTML update/tela-item-v1.html linhas 49-50. */}
            <form action={deleteItemAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <Button
                type="submit"
                color="error"
                variant="outlined"
                startIcon={<DeleteOutlineOutlinedIcon />}
                sx={{
                  padding: "8px 18px",
                  borderColor: "#F09595",
                  color: "#A32D2D",
                  "&:hover": { backgroundColor: "#FCEBEB", borderColor: "#F09595" }
                }}
              >
                Excluir item
              </Button>
            </form>
            {/* Phase 09-02 D-14: btn-primary hex tokens — HTML linhas 51-52. */}
            <Button
              type="submit"
              form={formId}
              variant="contained"
              startIcon={<SaveOutlinedIcon />}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                padding: "8px 18px",
                backgroundColor: "#185FA5",
                borderColor: "#185FA5",
                color: "#fff",
                "&:hover": { backgroundColor: "#0C447C" }
              }}
            >
              Salvar alteracoes
            </Button>
          </Stack>
        }
      />

      <ItemForm
        key={item.id}
        formId={formId}
        {...formOptions}
        initialValues={{
          id: item.id,
          code: item.code,
          name: item.name,
          description: item.description,
          type: item.type,
          operationalCategory: item.operationalCategory,
          active: item.active,
          purchases: item.purchases.map((purchase) => ({
            supplierName: purchase.supplierName,
            purchaseUnit: purchase.purchaseUnit,
            purchaseIsPrimary: purchase.purchaseIsPrimary,
            purchaseQuantity: purchase.purchaseQuantity,
            purchaseCost: purchase.purchaseCost,
            priceUpdatedAt: purchase.priceUpdatedAt,
            usageUnit: purchase.usageUnit ?? "",
            usageQuantity: purchase.usageQuantity ?? "",
            usageIsFixedFromPrimary: purchase.usageIsFixedFromPrimary ?? !purchase.purchaseIsPrimary
          }))
        }}
      >
        <StickyActionBar>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} width="100%">
            {/* Botao de excluir ja aparece no header (linha ~68), visivel em todas
                as telas — duplicar aqui como <form> aninhado dentro do <form> de
                edicao (ItemForm) e HTML invalido e causava erro de hidratacao. */}
            <FormSubmitButton
              variant="contained"
              startIcon={<SaveOutlinedIcon />}
              sx={{
                padding: "8px 18px",
                backgroundColor: "#185FA5",
                borderColor: "#185FA5",
                color: "#fff",
                "&:hover": { backgroundColor: "#0C447C" }
              }}
            >
              Salvar alteracoes
            </FormSubmitButton>
          </Stack>
        </StickyActionBar>
      </ItemForm>
    </Box>
  );
}
