"use client";

import { useState } from "react";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  duplicateFichaAction,
  inactivateFichaAction,
  deleteFichaAction,
  checkFichaDeletionAllowedAction
} from "@/modules/engineering/server/engineering-actions";

interface FichaHeaderActionsProps {
  fichaId: string;
}

const VERM = "#A32D2D";

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
  const [checking, setChecking] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBlockedOpen, setDeleteBlockedOpen] = useState(false);
  const [usedInFichas, setUsedInFichas] = useState<Array<{ id: string; name: string }>>([]);

  const handleDeleteClick = async () => {
    setChecking(true);
    try {
      const parents = await checkFichaDeletionAllowedAction(fichaId);
      if (parents.length > 0) {
        setUsedInFichas(parents);
        setDeleteBlockedOpen(true);
      } else {
        setDeleteConfirmOpen(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
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

      <form id="delete-ficha-form" action={deleteFichaAction.bind(null, fichaId)}>
        <Tooltip title="Excluir ficha">
          <IconButton
            aria-label="Excluir ficha"
            type="button"
            onClick={handleDeleteClick}
            disabled={checking}
            sx={{
              ...BTN_ICON_SX,
              color: VERM,
              '&:hover': { background: '#FCECEC', color: VERM }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h12M5 4v10a1 1 0 001 1h4a1 1 0 001-1V4M6 4V2a1 1 0 011-1h2a1 1 0 011 1v2" />
            </svg>
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

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Excluir ficha"
        description="Esta acao deleta permanentemente a ficha tecnica e todas as suas etapas e componentes. A acao nao pode ser desfeita."
        confirmLabel="Excluir ficha"
        confirmColor="error"
        confirmButtonType="submit"
        confirmFormId="delete-ficha-form"
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => setDeleteConfirmOpen(false)}
      />

      <Dialog
        open={deleteBlockedOpen}
        onClose={() => setDeleteBlockedOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle style={{ color: VERM }}>Exclusão Bloqueada</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            Esta ficha não pode ser excluída porque o item resultante é usado como componente nas seguintes fichas:
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              {usedInFichas.map((f) => (
                <li key={f.id} style={{ marginBottom: 4 }}>
                  <strong>{f.name}</strong>
                </li>
              ))}
            </ul>
            Remova este item dessas fichas antes de excluí-lo.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="contained" onClick={() => setDeleteBlockedOpen(false)}>
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
