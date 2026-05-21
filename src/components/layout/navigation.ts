import type { SvgIconComponent } from "@mui/icons-material";
import HistoryEduRoundedIcon from "@mui/icons-material/HistoryEduRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";

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
      { href: "/planos", label: "Planos", icon: SellRoundedIcon }
    ]
  }
];
