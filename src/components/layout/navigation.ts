import type { SvgIconComponent } from "@mui/icons-material";
import HistoryEduRoundedIcon from "@mui/icons-material/HistoryEduRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";

export interface NavigationItem {
  href: string;
  label: string;
  icon: SvgIconComponent;
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
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
      { href: "/cadastros", label: "Cadastros", icon: HistoryEduRoundedIcon }
    ]
  }
];
