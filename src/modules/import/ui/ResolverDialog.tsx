"use client";

import { useEffect, useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { resolveImportConflictAction } from "@/modules/import/server/import-actions";

interface ResolverDialogProps {
  open: boolean;
  conflict: {
    id: string;
    executionId?: string | null;
    rawName: string;
    normalizedName: string;
    suggestedItemName: string | null;
    suggestedAlias: string | null;
  } | null;
  itemOptions: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  onClose: () => void;
}

export function ResolverDialog({ open, conflict, itemOptions, onClose }: ResolverDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const suggestedItem = useMemo(
    () =>
      conflict?.suggestedItemName
        ? itemOptions.find((item) => item.name === conflict.suggestedItemName) ?? null
        : null,
    [conflict?.suggestedItemName, itemOptions]
  );
  const [selectedItem, setSelectedItem] = useState<(typeof itemOptions)[number] | null>(suggestedItem);
  const [alias, setAlias] = useState(conflict?.suggestedAlias ?? conflict?.rawName ?? "");
  const [applyToExecutionName, setApplyToExecutionName] = useState(Boolean(conflict?.executionId));

  useEffect(() => {
    setSelectedItem(suggestedItem);
    setAlias(conflict?.suggestedAlias ?? conflict?.rawName ?? "");
    setApplyToExecutionName(Boolean(conflict?.executionId));
  }, [conflict, suggestedItem]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <form action={resolveImportConflictAction}>
        <DialogTitle>Resolver pendencia</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <input type="hidden" name="conflictId" value={conflict?.id ?? ""} />
            <input type="hidden" name="executionId" value={conflict?.executionId ?? ""} />
            <input type="hidden" name="targetItemId" value={selectedItem?.id ?? ""} />

            <Stack spacing={0.75}>
              <Typography variant="body2" color="text.secondary">
                Nome de origem
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {conflict?.rawName ?? "\u2014"}
              </Typography>
            </Stack>

            <Stack spacing={0.75}>
              <Typography variant="body2" color="text.secondary">
                Nome normalizado
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {conflict?.normalizedName ?? "\u2014"}
              </Typography>
            </Stack>

            <Autocomplete
              options={itemOptions}
              value={selectedItem}
              onChange={(_event, value) => setSelectedItem(value)}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Item-alvo" required />}
            />

            <TextField
              label="Alias"
              name="alias"
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
            />

            {conflict?.executionId ? (
              <FormControlLabel
                control={
                  <Checkbox
                    name="applyToExecutionName"
                    checked={applyToExecutionName}
                    onChange={(event) => setApplyToExecutionName(event.target.checked)}
                  />
                }
                label="Aplicar para todas as ocorrencias deste nome nesta execucao"
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="outlined" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={!selectedItem}>
            Resolver
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
