import { CardapioForm } from "@/modules/menu/ui/cardapio-form";
import { PageHeader } from "@/modules/platform/ui/page-header";

export default function NewCardapioPage() {
  return (
    <>
      <PageHeader
        size="compact"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Cardápios", href: "/cardapios" },
          { label: "Novo cardápio" }
        ]}
        title="Novo cardápio"
        description="Crie um cardápio para organizar preços de venda por canal."
      />

      <CardapioForm formId="new-cardapio-form" />
    </>
  );
}
