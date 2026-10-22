"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { normalizeForMatch } from "@/modules/platform/domain/text-matching";
import type { SearchableFicha } from "@/modules/engineering/server/ficha-link-repository";
import type { PendingFichaItem } from "@/modules/engineering/server/ficha-link-repository";
import { linkFichaToPendingItemAction } from "@/modules/engineering/server/ficha-link-actions";

interface SearchFichaDialogProps {
  open: boolean;
  item: PendingFichaItem | null;
  allFichas: SearchableFicha[];
  onClose: () => void;
}

export function SearchFichaDialog({ open, item, allFichas, onClose }: SearchFichaDialogProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchableFicha | null>(null);

  const results = useMemo(() => {
    const normalizedQuery = normalizeForMatch(query);
    if (!normalizedQuery) return allFichas.slice(0, 50);
    return allFichas.filter((ficha) => normalizeForMatch(ficha.itemName).includes(normalizedQuery)).slice(0, 50);
  }, [query, allFichas]);

  function handleClose() {
    setQuery("");
    setSelected(null);
    onClose();
  }

  if (!item) return null;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Pesquisar ficha - {item.itemName}</DialogTitle>
      {!selected ? (
        <>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                autoFocus
                fullWidth
                size="small"
                label="Buscar por nome"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <List dense disablePadding sx={{ maxHeight: 360, overflowY: "auto" }}>
                {results.map((ficha) => (
                  <ListItemButton key={ficha.fichaId} onClick={() => setSelected(ficha)}>
                    <ListItemText primary={ficha.itemName} />
                  </ListItemButton>
                ))}
                {results.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
                    Nenhuma ficha encontrada.
                  </Typography>
                ) : null}
              </List>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="outlined" onClick={handleClose}>
              Cancelar
            </Button>
          </DialogActions>
        </>
      ) : (
        <form action={linkFichaToPendingItemAction}>
          <input type="hidden" name="sourceFichaId" value={selected.fichaId} />
          <input type="hidden" name="targetItemId" value={item.itemId} />
          <DialogContent dividers>
            <Stack spacing={2}>
              <Typography variant="body2">
                Vincular a ficha de <strong>{selected.itemName}</strong> a este item, exatamente como ela esta
                (ingredientes e custo nao sao recalculados).
              </Typography>
              {selected.usedAsIngredientCount > 0 ? (
                <Alert severity="warning">
                  Essa ficha e usada como ingrediente em {selected.usedAsIngredientCount}{" "}
                  {selected.usedAsIngredientCount === 1 ? "outra receita" : "outras receitas"}. Vincular aqui nao
                  move nem clona a ficha - essas receitas passam a depender deste item junto.
                </Alert>
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="outlined" onClick={() => setSelected(null)}>
              Voltar
            </Button>
            <Button type="submit" variant="contained">
              Vincular
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
}
