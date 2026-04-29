import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
import { ItemForm } from "@/modules/catalog/ui/item-form";
import { getMasterDataRepository } from "@/modules/master-data/server/master-data-repository";
import { PageHeader } from "@/modules/platform/ui/page-header";

export default async function NewItemPage() {
  const formOptions = await getMasterDataRepository().getItemFormOptions();
  const formId = "new-item-form";

  return (
    <Box sx={{ pb: { xs: 12, sm: 0 } }}>
      <PageHeader
        size="compact"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Itens", href: "/itens" },
          { label: "Novo item" }
        ]}
        title="Novo item"
        description="Cadastre um novo insumo ou material."
        actions={
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
            Salvar item
          </Button>
        }
      />

      <ItemForm formId={formId} {...formOptions} />

      <StickyActionBar>
        <Button
          type="submit"
          form={formId}
          fullWidth
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
          Salvar item
        </Button>
      </StickyActionBar>
    </Box>
  );
}
