import { notFound } from "next/navigation";
import Button from "@mui/material/Button";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { requireSession } from "@/modules/access/server/session-cookie";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import { deleteCardapioAction } from "@/modules/menu/server/menu-actions";
import { getMenuRepository } from "@/modules/menu/server/menu-repository";
import { CardapioForm } from "@/modules/menu/ui/cardapio-form";
import { CardapioItemsManager } from "@/modules/menu/ui/cardapio-items-manager";
import { PageHeader } from "@/modules/platform/ui/page-header";

const SELLABLE_TYPES = new Set(["prato", "porcao", "marmita", "combo", "produto_pronto"]);

export default async function CardapioDetailPage({
  params
}: {
  params: Promise<{ cardapioId: string }>;
}) {
  const [session, { cardapioId }] = await Promise.all([requireSession(), params]);
  const menuRepository = getMenuRepository(session.restaurantId);
  const [cardapio, itemOptions] = await Promise.all([
    menuRepository.getCardapioDetail(cardapioId),
    getCatalogRepository(session.restaurantId).listItemOptions()
  ]);

  if (!cardapio) {
    notFound();
  }

  const sellableOptions = itemOptions
    .filter((option) => SELLABLE_TYPES.has(option.type))
    .map((option) => ({ id: option.id, name: option.name, type: option.type }));

  return (
    <>
      <PageHeader
        size="compact"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Cardápios", href: "/cardapios" },
          { label: cardapio.name }
        ]}
        title={cardapio.name}
        description="Edite os dados do cardápio e gerencie os itens vinculados."
        actions={
          <form action={deleteCardapioAction}>
            <input type="hidden" name="cardapioId" value={cardapio.id} />
            <Button type="submit" color="error" variant="outlined" startIcon={<DeleteOutlineIcon />}>
              Excluir cardápio
            </Button>
          </form>
        }
      />

      <Stack spacing={4}>
        <CardapioForm
          formId="edit-cardapio-form"
          initialValues={{
            id: cardapio.id,
            name: cardapio.name,
            channel: cardapio.channel,
            active: cardapio.active
          }}
        />

        <Divider />

        <CardapioItemsManager cardapioId={cardapio.id} items={cardapio.items} itemOptions={sellableOptions} />
      </Stack>
    </>
  );
}
