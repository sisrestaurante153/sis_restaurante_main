"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { navigationSections } from "@/components/layout/navigation";

interface SidebarNavProps {
  compact?: boolean;
  onNavigate?: () => void;
  pendingCounts?: Partial<Record<string, number>>;
}

export function SidebarNav({
  compact = false,
  onNavigate,
  pendingCounts = {}
}: SidebarNavProps = {}) {
  const pathname = usePathname();
  const theme = useTheme();

  return (
    <Box component="nav" aria-label="Navegacao principal">
      {navigationSections.map((section) => (
        <Box key={section.label} sx={{ mb: 2.5 }}>
          {!compact ? (
            <Typography
              component="p"
              variant="overline"
              color="text.secondary"
              sx={{ display: "block", px: 1.5, pb: 1 }}
            >
              {section.label}
            </Typography>
          ) : null}

          <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const count = pendingCounts[item.href] ?? 0;
              const button = (
                <ListItemButton
                  LinkComponent={Link}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={compact ? item.label : undefined}
                  onClick={onNavigate}
                  sx={{
                    minHeight: 44,
                    px: compact ? 1 : 1.5,
                    justifyContent: compact ? "center" : "flex-start",
                    gap: compact ? 0 : 1.5,
                    borderLeft: "3px solid",
                    borderColor: isActive ? "primary.main" : "transparent",
                    borderRadius: 1.5,
                    color: isActive ? "primary.main" : "text.secondary",
                    bgcolor: isActive ? alpha(theme.palette.primary.main, 0.08) : "transparent",
                    "&:hover": {
                      bgcolor: isActive
                        ? alpha(theme.palette.primary.main, 0.12)
                        : alpha(theme.palette.primary.main, 0.04)
                    }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: compact ? 0 : 36,
                      color: "inherit",
                      justifyContent: "center"
                    }}
                  >
                    <Badge
                      color="warning"
                      badgeContent={count > 0 ? count : undefined}
                      overlap="circular"
                      max={99}
                    >
                      <item.icon fontSize="small" />
                    </Badge>
                  </ListItemIcon>
                  {!compact ? (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: "0.92rem",
                        fontWeight: isActive ? 600 : 500,
                        color: "inherit"
                      }}
                    />
                  ) : null}
                </ListItemButton>
              );

              return (
                <ListItem key={item.href} disablePadding>
                  {compact ? (
                    <Tooltip title={item.label} placement="right">
                      {button}
                    </Tooltip>
                  ) : (
                    button
                  )}
                </ListItem>
              );
            })}
          </List>
        </Box>
      ))}
    </Box>
  );
}
