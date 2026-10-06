"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { FichaCandidate } from "@/modules/engineering/domain/ficha-link-matching";
import type { PendingFichaItem } from "@/modules/engineering/server/ficha-link-repository";
import { linkFichaToPendingItemAction } from "@/modules/engineering/server/ficha-link-actions";

interface VincularFichaDialogProps {
  open: boolean;
  item: PendingFichaItem | null;
  onClose: () => void;
}

export function VincularFichaDialog({ open, item, onClose }: VincularFichaDialogProps) {
  const [selected, setSelected] = useState<FichaCandidate | null>(null);

  useEffect(() => {
    setSelected(item?.candidates[0] ?? null);
  }, [item]);

  if (!item) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form action={linkFichaToPendingItemAction}>
        <input type="hidden" name="sourceFichaId" value={selected?.fichaId ?? ""} />
        <input type="hidden" name="targetItemId" value={item.itemId} />

        <DialogTitle>Vincular ficha - {item.itemName}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              A ficha escolhida sera vinculada a este item exatamente como esta (ingredientes e rendimento nao sao
              alterados).
            </Typography>
            {selected?.usedAsIngredientCount ? (
              <Alert severity="warning">
                Essa ficha e usada como ingrediente em {selected.usedAsIngredientCount}{" "}
                {selected.usedAsIngredientCount === 1 ? "outra receita" : "outras receitas"}. Vincular aqui nao move
                nem clona a ficha - essas receitas passam a depender deste item junto.
              </Alert>
            ) : null}
            <FormControl>
              <RadioGroup
                value={selected?.fichaId ?? ""}
                onChange={(event) =>
                  setSelected(item.candidates.find((candidate) => candidate.fichaId === event.target.value) ?? null)
                }
              >
                {item.candidates.map((candidate) => (
                  <FormControlLabel
                    key={candidate.fichaId}
                    value={candidate.fichaId}
                    control={<Radio />}
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">{candidate.itemName}</Typography>
                        <Chip
                          size="small"
                          color={candidate.strength === "forte" ? "success" : "warning"}
                          label={candidate.strength === "forte" ? "match forte" : "match fraco"}
                        />
                      </Stack>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="outlined" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={!selected}>
            Vincular
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
