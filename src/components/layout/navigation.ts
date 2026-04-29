import type { SvgIconComponent } from "@mui/icons-material";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import HistoryEduRoundedIcon from "@mui/icons-material/HistoryEduRounded";

export interface NavigationItem {
  href: string;
  label: string;
  icon: SvgIconComponent;
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

// Navigation matches HTML reference (update/tela-fichas-grade-v1.html, tela-itens-grade-v2.html).
// Dashboard (/dashboard) and Composicao (/composicao) remain reachable by URL but are not listed
// in the sidebar — HTML reference does not include them.
export const navigationSections: NavigationSection[] = [
  {
    label: "Cadastros",
    items: [
      { href: "/itens", label: "Itens", icon: Inventory2RoundedIcon },
      { href: "/fichas", label: "Fichas Tecnicas", icon: LibraryBooksRoundedIcon },
      { href: "/cadastros", label: "Cadastros mestres", icon: HistoryEduRoundedIcon }
    ]
  },
  {
    label: "Operacao",
    items: [
      { href: "/montagem", label: "Fichas finais", icon: RestaurantRoundedIcon },
      { href: "/custos", label: "Custos", icon: PaidRoundedIcon }
    ]
  },
  {
    label: "Controle",
    items: [
      { href: "/importacao", label: "Importacao", icon: PendingActionsRoundedIcon },
      { href: "/auditoria", label: "Auditoria", icon: HistoryEduRoundedIcon }
    ]
  }
];
