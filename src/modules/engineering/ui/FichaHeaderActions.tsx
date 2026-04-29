"use client";

import { useState } from "react";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  duplicateFichaAction,
  inactivateFichaAction
} from "@/modules/engineering/server/engineering-actions";

interface FichaHeaderActionsProps {
  fichaId: string;
}

// Phase 09-04 D-05: tokens pixel-perfect do HTML update/tela-ficha-tecnica-v2.html linha 40.
// .btn-icon { padding: 7px 10px; border: 0.5px solid #D3D1C7; border-radius: 6px;
//   background: #fff; color: #5F5E5A; }
const BTN_ICON_SX = {
  padding: '7px 10px',
  border: '0.5px solid #D3D1C7',
  borderRadius: '6px',
  background: '#fff',
  color: '#5F5E5A',
  '&:hover': { background: '#F4F4F2' }
} as const;

export function FichaHeaderActions({ fichaId }: FichaHeaderActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      {/* Phase 09-04 D-05: Duplicar btn-icon — preserva handler real (duplicateFichaAction)
          e aplica tokens btn-icon do HTML linha 40 + SVG exato do HTML linha 247. */}
      <form action={duplicateFichaAction}>
        <input type="hidden" name="id" value={fichaId} />
        <Tooltip title="Duplicar">
          <IconButton
            aria-label="Duplicar ficha"
            type="submit"
            sx={BTN_ICON_SX}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="5" y="5" width="8" height="8" rx="1.5" />
              <path d="M3 11V3h8" />
            </svg>
          </IconButton>
        </Tooltip>
      </form>

      {/* Phase 09-04 D-05: Exportar btn-icon — estrutura visual apenas.
          TODO PDFV2-FUT-01: exportar PDF da ficha (roadmap v2). */}
      <Tooltip title="Exportar">
        <IconButton
          aria-label="Exportar ficha"
          onClick={() => { /* TODO PDFV2-FUT-01: exportar PDF da ficha */ }}
          sx={BTN_ICON_SX}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 10v3h10v-3M8 2v7M5 6l3-3 3 3" />
          </svg>
        </IconButton>
      </Tooltip>

      <form id="inactivate-ficha-form" action={inactivateFichaAction}>
        <input type="hidden" name="id" value={fichaId} />
        <Tooltip title="Inativar ficha">
          <IconButton
            aria-label="Inativar ficha"
            type="button"
            onClick={() => setConfirmOpen(true)}
            sx={BTN_ICON_SX}
          >
            <ArchiveOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Inativar ficha"
        description="Esta acao muda o status da ficha para inativa. O historico e os custos permanecem preservados."
        confirmLabel="Inativar ficha"
        confirmColor="warning"
        confirmButtonType="submit"
        confirmFormId="inactivate-ficha-form"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
      />
    </>
  );
}
