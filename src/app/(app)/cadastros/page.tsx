import Link from "next/link";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import ScaleRoundedIcon from "@mui/icons-material/ScaleRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import FastfoodRoundedIcon from "@mui/icons-material/FastfoodRounded";
import LabelRoundedIcon from "@mui/icons-material/LabelRounded";
import LinearScaleRoundedIcon from "@mui/icons-material/LinearScaleRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PageHeader } from "@/modules/platform/ui/page-header";
import { getMasterDataRepository } from "@/modules/master-data/server/master-data-repository";

interface MenuDef {
  title: string;
  description: string;
  href: string;
  icon: SvgIconComponent;
  accent: string;
  accentSoft: string;
}

const MENUS: MenuDef[] = [
  {
    title: "Fornecedores",
    description: "Parceiros e empresas usados nas referências de compra.",
    href: "/cadastros/fornecedores",
    icon: BusinessRoundedIcon,
    accent: "#185FA5",
    accentSoft: "#E6F1FB"
  },
  {
    title: "Unidades",
    description: "Unidades de compra, estoque e uso (kg, L, un...).",
    href: "/cadastros/unidades",
    icon: ScaleRoundedIcon,
    accent: "#A8631A",
    accentSoft: "#FDF1E0"
  },
  {
    title: "Categorias Operacionais",
    description: "Agrupamento de insumos e fichas técnicas.",
    href: "/cadastros/categorias",
    icon: CategoryRoundedIcon,
    accent: "#1B6B2C",
    accentSoft: "#EAF3DE"
  },
  {
    title: "Modalidades",
    description: "Modalidades selecionadas na ficha técnica.",
    href: "/cadastros/modalidades",
    icon: FastfoodRoundedIcon,
    accent: "#8B3FA8",
    accentSoft: "#F3E8F7"
  },
  {
    title: "Tipos de Item",
    description: "Nomenclatura dos tipos canônicos (insumo, preparo...).",
    href: "/cadastros/tipos-item",
    icon: LabelRoundedIcon,
    accent: "#2C2C2A",
    accentSoft: "#F0EFEA"
  },
  {
    title: "Tipos de Etapa",
    description: "Etapas que governam FC, IC e fluxo de montagem.",
    href: "/cadastros/tipos-etapa",
    icon: LinearScaleRoundedIcon,
    accent: "#A32D2D",
    accentSoft: "#FBEAEA"
  }
];

export default async function CadastrosHubPage() {
  const repository = getMasterDataRepository();
  const [suppliers, units, categories, modalities, itemTypes, stageTypes] = await Promise.all([
    repository.listSuppliers(),
    repository.listUnits(),
    repository.listOperationalCategories(),
    repository.listModalities(),
    repository.listItemTypes(),
    repository.listStageTypes()
  ]);

  const countsByHref: Record<string, { total: number; inactive: number }> = {
    "/cadastros/fornecedores": {
      total: suppliers.length,
      inactive: suppliers.filter((row) => !row.active).length
    },
    "/cadastros/unidades": {
      total: units.length,
      inactive: units.filter((row) => !row.active).length
    },
    "/cadastros/categorias": {
      total: categories.length,
      inactive: categories.filter((row) => !row.active).length
    },
    "/cadastros/modalidades": {
      total: modalities.length,
      inactive: modalities.filter((row) => !row.active).length
    },
    "/cadastros/tipos-item": {
      total: itemTypes.length,
      inactive: itemTypes.filter((row) => !row.active).length
    },
    "/cadastros/tipos-etapa": {
      total: stageTypes.length,
      inactive: stageTypes.filter((row) => !row.active).length
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Cadastros" }]}
        title="Cadastros Mestres"
        description="Dados base que afetam cálculos e agrupamentos em todo o sistema — fornecedores, unidades, categorias, modalidades e tipos canônicos."
        size="compact"
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" },
          gap: 2
        }}
      >
        {MENUS.map((menu) => {
          const counts = countsByHref[menu.href];
          const Icon = menu.icon;
          return (
            <Card key={menu.href} variant="outlined" sx={{ borderRadius: 3 }}>
              <CardActionArea component={Link} href={menu.href as never} sx={{ height: "100%" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: menu.accentSoft,
                        color: menu.accent
                      }}
                    >
                      <Icon fontSize="medium" />
                    </Box>
                    {counts ? (
                      <Stack alignItems="flex-end" spacing={0.5}>
                        <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#2C2C2A", lineHeight: 1 }}>
                          {counts.total}
                        </Typography>
                        {counts.inactive > 0 ? (
                          <Chip
                            size="small"
                            label={`${counts.inactive} inativo${counts.inactive > 1 ? "s" : ""}`}
                            sx={{
                              height: 18,
                              fontSize: 10,
                              fontWeight: 600,
                              bgcolor: "#FBEAEA",
                              color: "#A32D2D"
                            }}
                          />
                        ) : null}
                      </Stack>
                    ) : null}
                  </Stack>
                  <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#185FA5", mb: 0.5 }}>
                    {menu.title}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: "#6B6656" }}>{menu.description}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </>
  );
}
