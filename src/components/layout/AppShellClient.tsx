"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Drawer from "@mui/material/Drawer";
import Fade from "@mui/material/Fade";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { withBasePath } from "@/modules/platform/lib/base-path";

// Sidebar width matches HTML reference (update/tela-fichas-grade-v1.html .sidebar{width:192px}).
const SIDEBAR_WIDTH = 192;
const TOPBAR_HEIGHT = 56;

interface AppShellClientProps {
  currentUser: {
    name: string;
    email: string;
    roleCodes: string[];
  };
  children: React.ReactNode;
  pendingCounts?: Partial<Record<string, number>>;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface SidebarSurfaceProps {
  currentUser: AppShellClientProps["currentUser"];
  pendingCounts?: Partial<Record<string, number>>;
  onNavigate?: () => void;
  showLogout?: boolean;
}

function SidebarFooterLogout() {
  const router = useRouter();
  async function handleLogout() {
    await fetch(withBasePath("/api/auth/logout"), { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        display: "block",
        marginTop: 6,
        padding: 0,
        background: "none",
        border: "none",
        color: "#185FA5",
        fontSize: 11,
        fontFamily: "inherit",
        cursor: "pointer",
        textAlign: "left",
        lineHeight: 1.35
      }}
    >
      Sair
    </button>
  );
}

function SidebarSurface({ currentUser, pendingCounts, onNavigate, showLogout }: SidebarSurfaceProps) {
  const { roleCodes } = currentUser;
  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        flexDirection: "column",
        bgcolor: "#FAF7F0" // ink-50
      }}
    >
      {/* Logo — matches new landing page brand */}
      <Box
        sx={{
          px: 2,
          pt: 2.5,
          pb: 2.5,
          borderBottom: "1px solid",
          borderColor: "#EDE8DF", // ink-200
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          mx: 1.5,
          mb: 1
        }}
      >
        <Image src="/logo.jpg" alt="Logo" width={120} height={36} style={{ height: 36, width: "auto" }} priority />
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 0, pt: 0 }}>
        <SidebarNav onNavigate={onNavigate} pendingCounts={pendingCounts} roleCodes={roleCodes} />
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid",
          borderColor: "#EDE8DF"
        }}
      >
        <Typography
          component="div"
          sx={{
            fontSize: 11,
            color: "#A39F96", // ink-400
            lineHeight: 1.35,
            wordBreak: "break-all",
            fontFamily: "Manrope, sans-serif"
          }}
        >
          {currentUser.email}
        </Typography>
        {showLogout ? <SidebarFooterLogout /> : null}
      </Box>
    </Box>
  );
}

interface UserMenuProps {
  currentUser: AppShellClientProps["currentUser"];
}

function UserMenu({ currentUser }: UserMenuProps) {
  const theme = useTheme();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  async function handleLogout() {
    setAnchorEl(null);
    await fetch(withBasePath("/api/auth/logout"), { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        role="button"
        aria-label="Abrir menu do usuario"
        aria-haspopup="menu"
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setAnchorEl(event.currentTarget);
          }
        }}
        sx={{
          cursor: "pointer",
          px: 1,
          py: 0.5,
          borderRadius: 1,
          "&:hover": {
            bgcolor: alpha(theme.palette.primary.main, 0.04)
          }
        }}
      >
        <Avatar
          sx={{
            width: 30,
            height: 30,
            fontSize: 12,
            bgcolor: alpha(theme.palette.primary.main, 0.14),
            color: "primary.main",
            fontWeight: 700
          }}
        >
          {getInitials(currentUser.name)}
        </Avatar>
        <Typography
          component="span"
          sx={{
            display: { xs: "none", sm: "inline" },
            fontSize: 13,
            color: "text.primary",
            fontWeight: 500
          }}
        >
          {currentUser.name}
        </Typography>
        <ExpandMoreRoundedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
      </Stack>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}
      >
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sair</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export function AppShellClient({ currentUser, children, pendingCounts }: AppShellClientProps) {
  const theme = useTheme();
  const [overlayOpen, setOverlayOpen] = useState(false);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Mobile AppBar (keeps drawer toggle for xs/sm/md) */}
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          display: { xs: "flex", lg: "none" },
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: alpha(theme.palette.background.paper, 0.94),
          backdropFilter: "blur(14px)",
          color: "text.primary",
          zIndex: theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ minHeight: TOPBAR_HEIGHT }}>
          <IconButton
            aria-label="Abrir menu principal"
            edge="start"
            onClick={() => setOverlayOpen(true)}
            sx={{ mr: 1 }}
          >
            <MenuRoundedIcon />
          </IconButton>
          <Typography
            component="div"
            sx={{ flexGrow: 1, fontSize: 15, fontWeight: 600, color: "#185FA5" }}
          >
            SIS Restaurante
          </Typography>
          <UserMenu currentUser={currentUser} />
        </Toolbar>
      </AppBar>

      {/* Desktop: no AppBar. HTML reference (update/tela-fichas-grade-v1.html
          e tela-itens-grade-v2.html) nao tem topbar no desktop; o "Sair" vai
          para o rodape da sidebar como link azul discreto. */}

      {/* Desktop permanent sidebar (always expanded, matches HTML width 192px) */}
      <Drawer
        variant="permanent"
        open
        PaperProps={{
          sx: {
            width: SIDEBAR_WIDTH,
            overflowX: "hidden",
            borderRight: "0.5px solid",
            borderColor: "divider"
          }
        }}
        sx={{
          display: { xs: "none", lg: "block" },
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            boxSizing: "border-box"
          }
        }}
      >
        <SidebarSurface currentUser={currentUser} pendingCounts={pendingCounts} showLogout />
      </Drawer>

      {/* Mobile/tablet temporary drawer (summoned from AppBar) */}
      <Drawer
        variant="temporary"
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{ sx: { width: SIDEBAR_WIDTH } }}
        sx={{ display: { xs: "block", lg: "none" } }}
      >
        <SidebarSurface
          currentUser={currentUser}
          pendingCounts={pendingCounts}
          onNavigate={() => setOverlayOpen(false)}
        />
      </Drawer>

      <Box
        component="main"
        sx={{
          minHeight: "100vh",
          ml: {
            xs: 0,
            lg: `${SIDEBAR_WIDTH}px`
          }
        }}
      >
        <Container
          maxWidth="xl"
          sx={{
            px: { xs: 2, sm: 3, lg: 4 },
            py: { xs: 10, md: 4 },
            // Desktop: no AppBar -> padding-top pequeno (~22px, HTML reference).
            pt: { xs: 10, lg: "22px" }
          }}
        >
          <Fade in appear timeout={220}>
            <Box>{children}</Box>
          </Fade>
        </Container>
      </Box>
    </Box>
  );
}
