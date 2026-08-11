"use client";

import { useState, type ReactNode } from "react";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

interface FichaDetailTabsProps {
  formSlot: ReactNode;
  historySlot: ReactNode;
  historyCount: number;
}

// Aba "Historico" separada da aba "Ficha" (que contem o campo de texto livre
// Observacao) — pedido explicito do cliente: historico de edicoes/recalculos
// nao pode ficar misturado com a observacao manual.
export function FichaDetailTabs({ formSlot, historySlot, historyCount }: FichaDetailTabsProps) {
  const [tab, setTab] = useState<"ficha" | "historico">("ficha");

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
        <Tab value="ficha" icon={<DescriptionOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Ficha técnica" />
        <Tab
          value="historico"
          icon={<HistoryRoundedIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={historyCount > 0 ? `Histórico (${historyCount})` : "Histórico"}
        />
      </Tabs>

      {/* Mantem o form montado (display:none) ao trocar de aba, pra nao perder
          estado nao salvo do editor de etapas ao so espiar o historico. */}
      <Box sx={{ display: tab === "ficha" ? "block" : "none" }}>{formSlot}</Box>
      <Box sx={{ display: tab === "historico" ? "block" : "none" }}>{historySlot}</Box>
    </Box>
  );
}
