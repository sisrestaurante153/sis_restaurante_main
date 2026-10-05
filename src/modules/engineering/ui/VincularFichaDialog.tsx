"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { FichaCandidate } from "@/modules/engineering/domain/ficha-link-matching";
import { extractWeightInGrams } from "@/modules/engineering/domain/peso-extraction";
import type { PendingFichaItem } from "@/modules/engineering/server/ficha-link-repository";
import {
  confirmScaledFichaLinkAction,
  linkFichaToPendingItemAction,
  previewScaledFichaLinkAction,
  type ScaledLinkPreview,
  type ScaledLinkPreviewError
} from "@/modules/engineering/server/ficha-link-actions";

interface VincularFichaDialogProps {
  open: boolean;
  item: PendingFichaItem | null;
  onClose: () => void;
}

type Step = "pick" | "confirm-draft" | "review-scaled";

export function VincularFichaDialog({ open, item, onClose }: VincularFichaDialogProps) {
  const [step, setStep] = useState<Step>("pick");
  const [selected, setSelected] = useState<FichaCandidate | null>(null);
  const [preview, setPreview] = useState<ScaledLinkPreview | ScaledLinkPreviewError | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    setStep("pick");
    setSelected(item?.candidates[0] ?? null);
    setPreview(null);
  }, [item]);

  if (!item) return null;

  const weight = extractWeightInGrams(item.itemName);

  async function handleAvancar() {
    if (!selected || !item) return;

    if (!weight) {
      setStep("confirm-draft");
      return;
    }

    setStep("review-scaled");
    setLoadingPreview(true);
    const formData = new FormData();
    formData.set("sourceFichaId", selected.fichaId);
    formData.set("targetItemName", item.itemName);
    const result = await previewScaledFichaLinkAction(formData);
    setPreview(result);
    setLoadingPreview(false);
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Vincular ficha - {item.itemName}</DialogTitle>

      {step === "pick" ? (
        <>
          <DialogContent dividers>
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
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="outlined" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="contained" disabled={!selected} onClick={handleAvancar}>
              Avancar
            </Button>
          </DialogActions>
        </>
      ) : null}

      {step === "confirm-draft" ? (
        <form action={linkFichaToPendingItemAction}>
          <input type="hidden" name="sourceFichaId" value={selected?.fichaId ?? ""} />
          <input type="hidden" name="targetItemId" value={item.itemId} />
          <DialogContent dividers>
            <Alert severity="info">
              Nao foi possivel identificar o peso de &quot;{item.itemName}&quot; pelo nome. A ficha de &quot;
              {selected?.itemName}&quot; sera clonada exatamente como esta (sem recalcular quantidades) e salva como{" "}
              <strong>rascunho</strong> - ajuste as quantidades na tela de edicao antes de ativar.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="outlined" onClick={() => setStep("pick")}>
              Voltar
            </Button>
            <Button type="submit" variant="contained">
              Clonar como rascunho
            </Button>
          </DialogActions>
        </form>
      ) : null}

      {step === "review-scaled" ? (
        <form action={confirmScaledFichaLinkAction}>
          <input type="hidden" name="sourceFichaId" value={selected?.fichaId ?? ""} />
          <input type="hidden" name="targetItemId" value={item.itemId} />
          <input type="hidden" name="targetItemName" value={item.itemName} />
          <DialogContent dividers>
            {loadingPreview ? (
              <Stack alignItems="center" sx={{ py: 4 }}>
                <CircularProgress size={28} />
              </Stack>
            ) : preview && preview.ok ? (
              <Stack spacing={2}>
                <Alert severity="info">
                  Peso identificado: {weight?.rawMatch}. Fator de escala: {preview.scaleFactor}x. Revise as
                  quantidades recalculadas antes de confirmar.
                </Alert>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ingrediente</TableCell>
                      <TableCell>Antes</TableCell>
                      <TableCell>Depois</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.rows.map((row, index) => (
                      <TableRow key={`${row.itemName}-${index}`}>
                        <TableCell>{row.itemName}</TableCell>
                        <TableCell>{row.before}</TableCell>
                        <TableCell>{row.after}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Stack>
            ) : (
              <Alert severity="error">{preview && !preview.ok ? preview.message : "Nao foi possivel calcular."}</Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="outlined" onClick={() => setStep("pick")}>
              Voltar
            </Button>
            <Button type="submit" variant="contained" disabled={loadingPreview || !preview?.ok}>
              Confirmar e salvar como ativa
            </Button>
          </DialogActions>
        </form>
      ) : null}
    </Dialog>
  );
}
