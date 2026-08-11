"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  addLinkedItemAction,
  listLinkedItemsAction,
  removeLinkedItemAction,
  searchAddableItemsAction
} from "@/modules/master-data/server/linked-items-actions";
import type { LinkedItemsResult } from "@/modules/master-data/server/linked-items-repository";

interface LinkedItemsDialogProps {
  kind: string;
  recordId: string;
  recordName: string;
  usageLabel: string;
  inUseCount: number;
}

export function LinkedItemsButton({ kind, recordId, recordName, usageLabel, inUseCount }: LinkedItemsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LinkedItemsResult | null>(null);
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const [addQuery, setAddQuery] = useState("");
  const [addOptions, setAddOptions] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const result = await listLinkedItemsAction(kind, recordId);
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      setMessage(null);
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !data?.canAdd) return;
    const timeout = setTimeout(() => {
      void searchAddableItemsAction(kind, addQuery).then(setAddOptions);
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addQuery, open, data?.canAdd]);

  async function handleAdd(itemId: string) {
    setPendingId(itemId);
    const result = await addLinkedItemAction(kind, recordId, itemId);
    setMessage({ severity: result.ok ? "success" : "error", text: result.message ?? (result.ok ? "Vinculado." : "Erro ao vincular.") });
    if (result.ok) {
      await refresh();
      setAddQuery("");
    }
    setPendingId(null);
  }

  async function handleRemove(itemId: string) {
    setPendingId(itemId);
    const result = await removeLinkedItemAction(kind, recordId, itemId);
    setMessage({ severity: result.ok ? "success" : "error", text: result.message ?? (result.ok ? "Removido." : "Erro ao remover.") });
    if (result.ok) {
      await refresh();
    }
    setPendingId(null);
  }

  return (
    <>
      <Box sx={{ textAlign: "center" }}>
        {inUseCount > 0 ? (
          <Chip
            size="small"
            clickable
            onClick={() => setOpen(true)}
            label={`${inUseCount} ${usageLabel}`}
            sx={{ bgcolor: "#E6F1FB", color: "#185FA5", fontWeight: 600, fontSize: 11 }}
          />
        ) : (
          <Chip
            size="small"
            clickable
            variant="outlined"
            onClick={() => setOpen(true)}
            label="sem uso"
            sx={{ fontSize: 11, color: "text.disabled", borderColor: "#D3D1C7" }}
          />
        )}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>
          Itens associados — {recordName}
        </DialogTitle>
        <DialogContent dividers>
          {message ? (
            <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          ) : null}

          {loading || !data ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={22} />
            </Box>
          ) : (
            <Stack spacing={2}>
              {data.rows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum {data.mode === "fichas" ? "ficha técnica" : "item"} associado ainda.
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {data.rows.map((row, index) => (
                    <Stack
                      key={`${row.id}-${row.role ?? "default"}-${index}`}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ border: "0.5px solid #EFEDE6", borderRadius: 1.5, px: 1.5, py: 0.75 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Link href={row.href as never} style={{ textDecoration: "none", color: "#185FA5", fontSize: 13, fontWeight: 500 }}>
                          {row.name}
                        </Link>
                        {row.role ? (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {row.role}
                          </Typography>
                        ) : null}
                      </Box>
                      {row.removable ? (
                        <IconButton
                          size="small"
                          aria-label={`Remover ${row.name}`}
                          disabled={pendingId === row.id}
                          onClick={() => handleRemove(row.id)}
                          sx={{ color: "#888780", "&:hover": { color: "#A32D2D", bgcolor: "#FBEAEA" } }}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <Tooltip title={row.removeBlockedReason ?? "Não é possível remover por aqui."} arrow>
                          <span>
                            <IconButton size="small" disabled sx={{ color: "#D3D1C7" }}>
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Stack>
                  ))}
                </Stack>
              )}

              {data.canAdd ? (
                <Autocomplete
                  options={addOptions}
                  getOptionLabel={(option) => option.name}
                  inputValue={addQuery}
                  onInputChange={(_event, value) => setAddQuery(value)}
                  onChange={(_event, value) => {
                    if (value) handleAdd(value.id);
                  }}
                  loading={pendingId !== null}
                  renderInput={(params) => (
                    <TextField {...params} label="Adicionar item" placeholder="Buscar por nome..." size="small" />
                  )}
                />
              ) : (
                <Alert severity="info" icon={<LinkRoundedIcon fontSize="small" />}>
                  {data.addBlockedReason ?? "Vínculo gerenciado em outra tela."}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
