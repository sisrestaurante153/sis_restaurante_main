"use client";

import { useState } from "react";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import DiscountRoundedIcon from "@mui/icons-material/DiscountRounded";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";

type SimpleAction = "discount" | "trial" | "plan" | "cancel";

interface BillingActionsMenuProps {
  tenantName: string;
  status: string;
  currentMonthlyValue: number;
  onPriceChange?: (newValue: number) => void;
}

const SIMPLE_ACTION_LABELS: Record<SimpleAction, string> = {
  discount: "Aplicar desconto",
  trial: "Estender período de trial",
  plan: "Mudar plano",
  cancel: "Cancelar assinatura"
};

const SIMPLE_ACTION_MESSAGES: Record<SimpleAction, (name: string) => string> = {
  discount: (name) => `Aplicar desconto para "${name}"? Esta ação exigirá integração com o gateway de pagamento.`,
  trial: (name) => `Estender o período de trial de "${name}"? Configure a nova data de expiração no painel de faturamento.`,
  plan: (name) => `Mudar o plano de "${name}"? A cobrança proporcional será ajustada no próximo ciclo.`,
  cancel: (name) => `Cancelar a assinatura de "${name}"? O acesso será mantido até o fim do período pago atual.`
};

export function BillingActionsMenu({
  tenantName,
  status,
  currentMonthlyValue,
  onPriceChange
}: BillingActionsMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [simpleAction, setSimpleAction] = useState<SimpleAction | null>(null);
  const [editPriceOpen, setEditPriceOpen] = useState(false);
  const [priceInput, setPriceInput] = useState(String(currentMonthlyValue));
  const [priceError, setPriceError] = useState("");

  const isCancelled = status === "cancelled";

  function openMenu(e: React.MouseEvent<HTMLElement>) {
    setAnchor(e.currentTarget);
  }

  function closeMenu() {
    setAnchor(null);
  }

  function openEditPrice() {
    closeMenu();
    setPriceInput(String(currentMonthlyValue));
    setPriceError("");
    setEditPriceOpen(true);
  }

  function closeEditPrice() {
    setEditPriceOpen(false);
    setPriceError("");
  }

  function handleSavePrice() {
    const parsed = parseFloat(priceInput.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      setPriceError("Informe um valor maior que zero.");
      return;
    }
    onPriceChange?.(Math.round(parsed * 100) / 100);
    setEditPriceOpen(false);
  }

  return (
    <>
      <IconButton size="small" onClick={openMenu} aria-label="Ações da assinatura">
        <MoreVertRoundedIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={closeMenu}
        slotProps={{ paper: { sx: { minWidth: 220 } } }}
      >
        <MenuItem onClick={openEditPrice} disabled={isCancelled}>
          <ListItemIcon><EditRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Editar preço</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { closeMenu(); setSimpleAction("discount"); }} disabled={isCancelled}>
          <ListItemIcon><DiscountRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Aplicar desconto</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { closeMenu(); setSimpleAction("trial"); }} disabled={isCancelled}>
          <ListItemIcon><ExtensionRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Estender trial</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { closeMenu(); setSimpleAction("plan"); }} disabled={isCancelled}>
          <ListItemIcon><SwapHorizRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Mudar plano</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => { closeMenu(); setSimpleAction("cancel"); }}
          disabled={isCancelled}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "error.main" }}><BlockRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Cancelar assinatura</ListItemText>
        </MenuItem>
      </Menu>

      {/* Diálogo: editar preço */}
      <Dialog open={editPriceOpen} onClose={closeEditPrice} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: "Manrope, sans-serif", fontWeight: 700 }}>
          Editar preço da assinatura
        </DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tenant: <strong>{tenantName}</strong>
          </Typography>
          <TextField
            label="Novo valor mensal"
            value={priceInput}
            onChange={(e) => {
              setPriceInput(e.target.value);
              setPriceError("");
            }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSavePrice(); }}
            error={Boolean(priceError)}
            helperText={priceError || "O novo valor será aplicado no próximo ciclo de cobrança."}
            fullWidth
            autoFocus
            size="small"
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">R$</InputAdornment>
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeEditPrice} variant="outlined" size="small">
            Cancelar
          </Button>
          <Button
            onClick={handleSavePrice}
            variant="contained"
            size="small"
            sx={{ fontWeight: 600, backgroundColor: "#185FA5", "&:hover": { backgroundColor: "#0C447C" } }}
          >
            Salvar preço
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: ações simples */}
      <Dialog open={Boolean(simpleAction)} onClose={() => setSimpleAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: "Manrope, sans-serif", fontWeight: 700 }}>
          {simpleAction ? SIMPLE_ACTION_LABELS[simpleAction] : ""}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {simpleAction ? SIMPLE_ACTION_MESSAGES[simpleAction](tenantName) : ""}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 1.5, display: "block" }}>
            Esta funcionalidade será integrada ao gateway de pagamento em uma próxima versão.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSimpleAction(null)} variant="outlined" size="small">
            Fechar
          </Button>
          <Button
            onClick={() => setSimpleAction(null)}
            variant="contained"
            size="small"
            color={simpleAction === "cancel" ? "error" : "primary"}
            sx={{ fontWeight: 600 }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
