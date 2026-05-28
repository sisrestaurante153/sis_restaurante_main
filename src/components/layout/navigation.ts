import type { SvgIconComponent } from "@mui/icons-material";
import HistoryEduRoundedIcon from "@mui/icons-material/HistoryEduRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";

export interface NavigationItem {
  href: string;
  label: string;
  icon: SvgIconComponent;
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
  adminOnly?: boolean;
}

export const navigationSections: NavigationSection[] = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: SpaceDashboardRoundedIcon }
    ]
  },
  {
    label: "Cadastros",
    items: [
      { href: "/itens", label: "Itens", icon: Inventory2RoundedIcon },
      { href: "/fichas", label: "Fichas Tecnicas", icon: LibraryBooksRoundedIcon },
      { href: "/cadastros", label: "Cadastros", icon: HistoryEduRoundedIcon },
      { href: "/importacao", label: "Importacao", icon: CloudUploadRoundedIcon }
    ]
  },
  {
    label: "Administracao",
    adminOnly: true,
    items: [
      { href: "/billing", label: "Assinaturas", icon: CreditCardRoundedIcon },
      { href: "/planos", label: "Planos", icon: SellRoundedIcon },
      { href: "/restaurantes", label: "Restaurantes", icon: StorefrontRoundedIcon },
      { href: "/usuarios", label: "Usuários", icon: PeopleAltRoundedIcon }
    ]
  }
];

export function getNavigationSections(roleCodes: string[]): NavigationSection[] {
  const isSuperAdmin = roleCodes.includes("super-admin");
  const isAdmin = roleCodes.includes("admin");

  const sections: NavigationSection[] = [
    {
      label: "Principal",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: SpaceDashboardRoundedIcon }
      ]
    },
    {
      label: "Cadastros",
      items: [
        { href: "/itens", label: "Itens", icon: Inventory2RoundedIcon },
        { href: "/fichas", label: "Fichas Tecnicas", icon: LibraryBooksRoundedIcon },
        { href: "/cadastros", label: "Cadastros", icon: HistoryEduRoundedIcon },
        { href: "/importacao", label: "Importacao", icon: CloudUploadRoundedIcon }
      ]
    }
  ];


  if (isSuperAdmin) {
    // 1. Minha Conta
    sections.push({
      label: "Minha Conta",
      adminOnly: true,
      items: [
        { href: "/assinatura", label: "Assinatura", icon: CreditCardRoundedIcon },
        { href: "/planos", label: "Plano", icon: SellRoundedIcon },
        { href: "/usuarios", label: "Usuários", icon: PeopleAltRoundedIcon }
      ]
    });
    // 2. Administração da Plataforma
    sections.push({
      label: "Administração da Plataforma",
      adminOnly: true,
      items: [
        { href: "/restaurantes", label: "Restaurantes", icon: StorefrontRoundedIcon },
        { href: "/admin/planos", label: "Planos globais", icon: SellRoundedIcon },
        { href: "/usuarios", label: "Usuários globais", icon: PeopleAltRoundedIcon },
        { href: "/admin/clonar-dados", label: "Clonar Dados", icon: ContentCopyRoundedIcon },
        { href: "/billing", label: "Admin Dashboard", icon: SpaceDashboardRoundedIcon }
      ]
    });
  } else if (isAdmin) {
    sections.push({
      label: "Minha Conta",
      adminOnly: true,
      items: [
        { href: "/assinatura", label: "Assinatura", icon: CreditCardRoundedIcon },
        { href: "/planos", label: "Plano", icon: SellRoundedIcon },
        { href: "/usuarios", label: "Usuários", icon: PeopleAltRoundedIcon }
      ]
    });
  }

  return sections;
}
