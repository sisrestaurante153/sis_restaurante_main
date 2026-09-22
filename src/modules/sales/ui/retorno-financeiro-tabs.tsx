"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import TableRowsOutlinedIcon from "@mui/icons-material/TableRowsOutlined";
import { FinancialReturnView } from "@/modules/sales/ui/financial-return-view";
import { MenuEngineeringMatrix } from "@/modules/sales/ui/menu-engineering-matrix";
import type { FinancialReturnRow } from "@/modules/sales/domain/types";

export function RetornoFinanceiroTabs({ rows }: { rows: FinancialReturnRow[] }) {
  const [tab, setTab] = useState<"itens" | "matriz">("itens");

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_event, value) => setTab(value)}
        sx={{
          mb: 2.5,
          minHeight: 40,
          borderBottom: "1px solid #D3D1C7",
          "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 600, fontSize: 14 }
        }}
      >
        <Tab value="itens" icon={<TableRowsOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Por item" />
        <Tab
          value="matriz"
          icon={<GridViewOutlinedIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label="Matriz Giro x Margem"
        />
      </Tabs>

      <Box sx={{ display: tab === "itens" ? "block" : "none" }}>
        <FinancialReturnView rows={rows} />
      </Box>
      <Box sx={{ display: tab === "matriz" ? "block" : "none" }}>
        <MenuEngineeringMatrix rows={rows} />
      </Box>
    </Box>
  );
}
