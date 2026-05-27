"use client";

import { useState, useEffect } from "react";
import { getPlanConfigsAction, savePlanConfigAction, deletePlanConfigAction } from "@/modules/billing/server/billing-actions";
import type { Plan } from "@/modules/billing/domain/plans";
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  Grid, 
  IconButton, 
  Stack, 
  TextField, 
  Typography,
  CircularProgress
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

interface PlanManagerProps {
  readOnly?: boolean;
}

export function PlanManager({ readOnly = false }: PlanManagerProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await getPlanConfigsAction();
      setPlans(data as Plan[]);
    } catch (err) {
      console.error("Erro ao buscar planos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSave = async () => {
    if (!editingPlan) return;
    try {
      await savePlanConfigAction(editingPlan as Required<Omit<Plan, 'id'>>);
      setDialogOpen(false);
      fetchPlans();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar plano");
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm("Tem certeza que deseja desativar este plano?")) return;
    try {
      await deletePlanConfigAction(code);
      fetchPlans();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir plano");
    }
  };

  const openDialog = (plan?: Plan) => {
    setEditingPlan(plan || {
      code: "",
      label: "",
      monthlyValue: 0,
      description: "",
      limits: { users: 1, items: 100, fichas: 50 }
    });
    setDialogOpen(true);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h5" fontWeight={700}>Planos e Preços</Typography>
        {!readOnly && (
          <Button 
            variant="contained" 
            startIcon={<AddRoundedIcon />}
            onClick={() => openDialog()}
            sx={{ bgcolor: "#185FA5" }}
          >
            Novo Plano
          </Button>
        )}
      </Stack>
 
      <Grid container spacing={3}>
        {plans.map((plan) => (
          <Grid key={plan.code} size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, border: '1px solid #EDE8DF' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{plan.label}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                      {plan.code}
                    </Typography>
                  </Box>
                  {!readOnly && (
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => openDialog(plan)}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(plan.code)}>
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>

                <Typography variant="h4" fontWeight={800} color="primary" sx={{ mt: 2, mb: 1 }}>
                  R$ {plan.monthlyValue}
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                    /mês
                  </Typography>
                </Typography>

                <Typography variant="body2" color="text.secondary" mb={2}>
                  {plan.description}
                </Typography>

                <Box sx={{ bgcolor: '#F8F9FA', p: 1.5, borderRadius: 2 }}>
                  <Typography variant="caption" fontWeight={700} display="block" mb={1}>LIMITES</Typography>
                  <Stack spacing={0.5}>
                    <Typography variant="caption">• {plan.limits.users} Usuários</Typography>
                    <Typography variant="caption">• {plan.limits.items} Itens</Typography>
                    <Typography variant="caption">• {plan.limits.fichas} Fichas</Typography>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPlan?.id ? "Editar Plano" : "Novo Plano"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Código (slug)"
              value={editingPlan?.code || ""}
              onChange={(e) => setEditingPlan(prev => ({ ...prev, code: e.target.value }))}
              disabled={!!editingPlan?.id}
              fullWidth
              size="small"
            />
            <TextField
              label="Nome do Plano"
              value={editingPlan?.label || ""}
              onChange={(e) => setEditingPlan(prev => ({ ...prev, label: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Valor Mensal (R$)"
              type="number"
              value={editingPlan?.monthlyValue || 0}
              onChange={(e) => setEditingPlan(prev => ({ ...prev, monthlyValue: Number(e.target.value) }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Descrição"
              multiline
              rows={2}
              value={editingPlan?.description || ""}
              onChange={(e) => setEditingPlan(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              size="small"
            />
            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1 }}>Limites</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 4 }}>
                <TextField
                  label="Usuários"
                  type="number"
                  value={editingPlan?.limits?.users || 0}
                  onChange={(e) => setEditingPlan(prev => ({ 
                    ...prev, 
                    limits: { ...prev!.limits!, users: Number(e.target.value) } 
                  }))}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <TextField
                  label="Itens"
                  type="number"
                  value={editingPlan?.limits?.items || 0}
                  onChange={(e) => setEditingPlan(prev => ({ 
                    ...prev, 
                    limits: { ...prev!.limits!, items: Number(e.target.value) } 
                  }))}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <TextField
                  label="Fichas"
                  type="number"
                  value={editingPlan?.limits?.fichas || 0}
                  onChange={(e) => setEditingPlan(prev => ({ 
                    ...prev, 
                    limits: { ...prev!.limits!, fichas: Number(e.target.value) } 
                  }))}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" sx={{ bgcolor: "#185FA5" }}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
