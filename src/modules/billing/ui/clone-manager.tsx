"use client";

import { useState, useEffect } from "react";
import {
  listRestaurantsAction
} from "@/modules/billing/server/restaurant-management-actions";
import {
  getCloneSummaryAction,
  clonarDadosAction
} from "@/modules/billing/server/clone-actions";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  Divider
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import CloudDownloadRoundedIcon from "@mui/icons-material/CloudDownloadRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";

type Restaurant = {
  id: string;
  name: string;
  plan: string;
};

export function CloneManager() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState<{ itemsCount: number; fichasCount: number } | null>(null);

  // Checkboxes
  const [cloneItems, setCloneItems] = useState(true);
  const [cloneFichas, setCloneFichas] = useState(true);
  const [clonePurchases, setClonePurchases] = useState(true);

  // Execution
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  
  // Results
  const [report, setReport] = useState<{
    itemsCreated: number;
    itemsIgnored: number;
    purchasesCreated: number;
    purchasesIgnored: number;
    fichasCreated: number;
    fichasIgnored: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await listRestaurantsAction();
        setRestaurants(data);
      } catch (err) {
        console.error("Erro ao carregar lista de restaurantes:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleLoadSummary() {
    if (!originId) return;
    setLoadingSummary(true);
    setError(null);
    setSummary(null);
    setReport(null);
    try {
      const data = await getCloneSummaryAction(originId);
      setSummary(data);
    } catch (err) {
      setError("Erro ao carregar dados do restaurante de origem.");
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  }

  function handleStartClick() {
    if (!originId || !destinationId) return;
    setConfirmOpen(true);
  }

  async function handleConfirmClone() {
    setConfirmOpen(false);
    setExecuting(true);
    setProgress(5);
    setProgressStatus("Preparando clonagem...");
    setReport(null);
    setError(null);

    // Simulate progress updates during the Server Action call
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) {
          setProgressStatus(`Clonando itens... (${Math.round((prev / 40) * (summary?.itemsCount || 0))} de ${summary?.itemsCount || 0})`);
          return prev + 2;
        } else if (prev < 60) {
          setProgressStatus("Clonando compras e fornecedores...");
          return prev + 3;
        } else if (prev < 90) {
          const fichasProgress = (prev - 60) / 30;
          setProgressStatus(`Clonando fichas... (${Math.round(fichasProgress * (summary?.fichasCount || 0))} de ${summary?.fichasCount || 0})`);
          return prev + 1.5;
        }
        return prev;
      });
    }, 150);

    try {
      const result = await clonarDadosAction({
        originId,
        destinationId,
        cloneItems,
        clonePurchases,
        cloneFichas
      });

      clearInterval(progressInterval);

      if (!result.ok) {
        setError(result.message ?? "Ocorreu um erro durante a clonagem.");
        setExecuting(false);
        return;
      }

      setProgress(100);
      setProgressStatus("Concluído ✓");
      setReport(result.report);
    } catch (err) {
      clearInterval(progressInterval);
      setError("Erro de rede ou timeout ao executar clonagem.");
      console.error(err);
    } finally {
      setExecuting(false);
    }
  }

  const originName = restaurants.find(r => r.id === originId)?.name || "";
  const destName = restaurants.find(r => r.id === destinationId)?.name || "";

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {report && (
        <Alert
          severity="success"
          icon={<CheckCircleRoundedIcon fontSize="inherit" />}
          sx={{ mb: 4 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Clonagem de dados realizada com sucesso!
          </Typography>
          <Stack spacing={0.5} sx={{ fontSize: 13 }}>
            <div>• <strong>Itens:</strong> {report.itemsCreated} criados, {report.itemsIgnored} ignorados (já existentes).</div>
            <div>• <strong>Fichas Técnicas:</strong> {report.fichasCreated} criadas, {report.fichasIgnored} ignoradas.</div>
            <div>• <strong>Compras/Fornecedores:</strong> {report.purchasesCreated} vínculos criados, {report.purchasesIgnored} ignorados.</div>
          </Stack>
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
          Passo 1 — Selecionar origem e destino
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <FormControl fullWidth size="small">
            <InputLabel>Restaurante de Origem</InputLabel>
            <Select
              label="Restaurante de Origem"
              value={originId}
              onChange={(e) => {
                setOriginId(e.target.value);
                setSummary(null);
                setReport(null);
              }}
            >
              {restaurants.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name} ({r.plan.toUpperCase()})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Restaurante de Destino</InputLabel>
            <Select
              label="Restaurante de Destino"
              value={destinationId}
              onChange={(e) => {
                setDestinationId(e.target.value);
                setReport(null);
              }}
              disabled={!originId}
            >
              {restaurants
                .filter((r) => r.id !== originId)
                .map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name} ({r.plan.toUpperCase()})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            onClick={handleLoadSummary}
            disabled={!originId || loadingSummary || executing}
            startIcon={loadingSummary ? <CircularProgress size={14} /> : <CloudDownloadRoundedIcon />}
            sx={{ minWidth: 160, height: 40 }}
          >
            {loadingSummary ? "Carregando…" : "Carregare dados"}
          </Button>
        </Stack>
      </Paper>

      {summary && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Passo 2 — Resumo e seleção do que clonar
          </Typography>

          <Alert severity="info" icon={<InfoRoundedIcon />} sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              Os dados serão copiados para o restaurante destino. Itens com o mesmo nome serão ignorados (não duplicados).
            </Typography>
          </Alert>

          <Stack spacing={1} mb={3}>
            <Typography variant="body2" color="text.secondary">
              • Total de itens encontrados no restaurante origem: <strong>{summary.itemsCount}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Total de fichas técnicas encontradas: <strong>{summary.fichasCount}</strong>
            </Typography>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={1}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={cloneItems}
                  onChange={(e) => {
                    setCloneItems(e.target.checked);
                    if (!e.target.checked) {
                      setClonePurchases(false);
                      setCloneFichas(false);
                    }
                  }}
                  disabled={executing}
                />
              }
              label="Clonar todos os Itens (insumos, embalagens, etc.)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={clonePurchases}
                  onChange={(e) => setClonePurchases(e.target.checked)}
                  disabled={!cloneItems || executing}
                />
              }
              label="Clonar Compras e Fornecedores dos Itens"
              sx={{ pl: 3 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={cloneFichas}
                  onChange={(e) => setCloneFichas(e.target.checked)}
                  disabled={!cloneItems || executing}
                />
              }
              label="Clonar todas as Fichas Técnicas"
              sx={{ pl: 3 }}
            />
          </Stack>

          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={handleStartClick}
              disabled={!destinationId || executing || (!cloneItems && !cloneFichas && !clonePurchases)}
              startIcon={<PlayArrowRoundedIcon />}
              size="large"
            >
              Iniciar Clonagem
            </Button>
          </Box>
        </Paper>
      )}

      {(executing || progress > 0) && !report && !error && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Passo 3 — Executando Clonagem
          </Typography>
          <Stack spacing={2}>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" sx={{ fontWeight: 500 }} color="primary">
                {progressStatus}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Clonagem</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Você está prestes a clonar os dados selecionados de <strong>{originName}</strong> para <strong>{destName}</strong>. 
            Confirmar esta operação?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={executing}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleConfirmClone} disabled={executing} autoFocus>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
