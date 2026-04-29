import type { ReactNode } from "react";
import NextLink from "next/link";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { StatusChip } from "@/components/ui/StatusChip";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  status?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  /**
   * "compact" encolhe o h1 para 22px / weight 600 e reduz o espaco vertical
   * para casar com HTML listing reference (update/tela-fichas-grade-v1.html
   * .page-title{font-size:22px}). Outras paginas continuam usando o default.
   */
  size?: "default" | "compact";
}

export function PageHeader({
  eyebrow,
  title,
  description,
  status,
  actions,
  breadcrumbs,
  size = "default"
}: PageHeaderProps) {
  const isCompact = size === "compact";
  return (
    <Box
      sx={{
        mb: isCompact ? "18px" : 4,
        pb: isCompact ? 0 : 3,
        borderBottom: isCompact ? "none" : "1px solid",
        borderColor: "divider"
      }}
    >
      <Stack spacing={isCompact ? "12px" : 2}>
        {breadcrumbs?.length ? (
          <Breadcrumbs
            aria-label="Breadcrumb"
            separator={<NavigateNextRoundedIcon sx={{ fontSize: 18, color: "text.disabled" }} />}
          >
            {breadcrumbs.map((breadcrumb, index) =>
              breadcrumb.href ? (
                <NextLink
                  key={`${breadcrumb.label}-${index}`}
                  href={breadcrumb.href as never}
                  style={{ textDecoration: "none" }}
                >
                  <Typography
                    component="span"
                    color={index === breadcrumbs.length - 1 ? "text.primary" : "text.secondary"}
                    fontSize="0.9rem"
                    fontWeight={index === breadcrumbs.length - 1 ? 600 : 500}
                    sx={{
                      "&:hover": {
                        textDecoration: "underline"
                      }
                    }}
                  >
                    {breadcrumb.label}
                  </Typography>
                </NextLink>
              ) : (
                <Typography
                  key={`${breadcrumb.label}-${index}`}
                  color="text.primary"
                  fontSize="0.9rem"
                  fontWeight={600}
                >
                  {breadcrumb.label}
                </Typography>
              )
            )}
          </Breadcrumbs>
        ) : eyebrow ? (
          <Typography variant="overline" color="text.secondary">
            {eyebrow}
          </Typography>
        ) : null}

        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "flex-start" }}
          spacing={2.5}
        >
          <Box sx={{ minWidth: 0, maxWidth: 760 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography
                component="h1"
                variant="h1"
                sx={
                  isCompact
                    ? { fontSize: 22, fontWeight: 600, lineHeight: 1.25, color: "#2C2C2A" }
                    : undefined
                }
              >
                {title}
              </Typography>
              {status ? <StatusChip status={status} /> : null}
            </Stack>
            <Typography
              variant={isCompact ? "body2" : "subtitle1"}
              sx={
                isCompact
                  ? { mt: "3px", fontSize: 12, color: "#888780" }
                  : { mt: 1 }
              }
            >
              {description}
            </Typography>
          </Box>

          {actions ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              justifyContent="flex-end"
              alignItems={{ xs: "stretch", sm: "center" }}
              sx={{ flexShrink: 0 }}
            >
              {actions}
            </Stack>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}
