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
import { getNavigationSections } from "@/components/layout/navigation";

interface SidebarNavProps {
  compact?: boolean;
  onNavigate?: () => void;
  pendingCounts?: Partial<Record<string, number>>;
  roleCodes?: string[];
}

export function SidebarNav({
  compact = false,
  onNavigate,
  pendingCounts = {},
  roleCodes = []
}: SidebarNavProps = {}) {
  const pathname = usePathname();
  const visibleSections = getNavigationSections(roleCodes);

  return (
    <Box component="nav" aria-label="Navegacao principal">
      {visibleSections.map((section) => (
        <Box key={section.label} sx={{ mb: 1 }}>
          {!compact ? (
            <Typography
              component="p"
              sx={{ 
                display: "block", 
                px: 3, 
                pt: 3, 
                pb: 1.5, 
                fontSize: 10,
                fontWeight: 600,
                color: "#A39F96", // ink-400
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontFamily: "Manrope, sans-serif"
              }}
            >
              {section.label}
            </Typography>
          ) : null}

          <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5, px: 2 }}>
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
                    minHeight: 40,
                    px: compact ? 1 : 1.5,
                    py: 1,
                    justifyContent: compact ? "center" : "flex-start",
                    gap: compact ? 0 : 1.5,
                    borderRadius: 1.5,
                    color: isActive ? "#FFFFFF" : "#4A4741", // white or ink-600
                    bgcolor: isActive ? "#004A99" : "transparent", // blue-700 or transparent
                    "&:hover": {
                      bgcolor: isActive ? "#004A99" : "#FFFFFF", // blue-700 or white
                      color: isActive ? "#FFFFFF" : "#0A0A0A" // white or ink-900
                    }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: compact ? 0 : 30,
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
                      <item.icon sx={{ fontSize: 20 }} />
                    </Badge>
                  </ListItemIcon>
                  {!compact ? (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: "0.85rem",
                        fontWeight: 500,
                        color: "inherit",
                        fontFamily: "Manrope, sans-serif"
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
