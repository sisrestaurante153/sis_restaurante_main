import Link from "next/link";
import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import { requireSession } from "@/modules/access/server/session-cookie";
import { getMenuRepository } from "@/modules/menu/server/menu-repository";
import { MenuListingView } from "@/modules/menu/ui/menu-listing-view";
import { PageHeader } from "@/modules/platform/ui/page-header";

export default async function CardapiosPage() {
  const session = await requireSession();
  const cardapios = await getMenuRepository(session.restaurantId).listCardapios();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Cardápios" }
        ]}
        title="Cardápios"
        description="Monte catálogos de venda com preços por canal (salão, delivery) e vincule fichas por dia da semana."
        actions={
          <Button
            component={Link}
            href="/cardapios/novo"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ backgroundColor: "#185FA5", "&:hover": { backgroundColor: "#0C447C" } }}
          >
            Novo cardápio
          </Button>
        }
        size="compact"
      />

      <MenuListingView cardapios={cardapios} />
    </>
  );
}
