import { CardapioForm } from "@/modules/menu/ui/cardapio-form";
import { getMasterDataRepository } from "@/modules/master-data/server/master-data-repository";
import { PageHeader } from "@/modules/platform/ui/page-header";

export default async function NewCardapioPage() {
  const channels = await getMasterDataRepository().listSalesChannels();
  const channelOptions = channels.filter((channel) => channel.active).map((channel) => ({ code: channel.code, name: channel.name }));

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

      <CardapioForm formId="new-cardapio-form" channelOptions={channelOptions} />
    </>
  );
}
