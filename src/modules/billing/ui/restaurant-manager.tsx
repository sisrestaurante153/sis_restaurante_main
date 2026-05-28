"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listRestaurantsAction,
  createRestaurantAction,
  updateRestaurantAction,
  deleteRestaurantAction,
  extendSubscriptionAction
} from "@/modules/billing/server/restaurant-management-actions";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";

const PLANS_MAP = {
  starter: { label: "Starter", color: "default" as const },
  pro: { label: "Pro", color: "primary" as const },
  enterprise: { label: "Enterprise", color: "secondary" as const }
};


type RestaurantRecord = {
  id: string;
  name: string;
  plan: string;
  status: string;
  userCount: number;
  createdAt: string;
  nextBillingDate: string | null;
  trialEndsAt: string | null;
  adminEmail: string | null;
};

type FormState = {
  id?: string;
  name: string;
  email: string;
  password: string;
  planCode: "starter" | "pro" | "enterprise";
  status: "trial" | "active" | "overdue" | "cancelled" | "suspended" | "bloqueada" | "expirada";
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  planCode: "starter",
  status: "trial"
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const parts = dateOnly.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function isExpired(restaurant: RestaurantRecord): boolean {
  const status = restaurant.status.toLowerCase();
  if (["bloqueada", "cancelled", "suspended", "expirada", "overdue", "cancelada"].includes(status)) {
    return true;
  }
  const now = new Date();
  if (status === "trial" && restaurant.trialEndsAt) {
    return now > new Date(restaurant.trialEndsAt);
  }
  if (restaurant.nextBillingDate) {
    return now > new Date(restaurant.nextBillingDate);
  }
  return false;
}

function isExpiredOrExpiringSoon(restaurant: RestaurantRecord): boolean {
  if (isExpired(restaurant)) return true;
  const status = restaurant.status.toLowerCase();
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (status === "active" && restaurant.nextBillingDate) {
    const limit = new Date(restaurant.nextBillingDate);
    return limit > now && limit <= sevenDaysFromNow;
  }
  if (status === "trial" && restaurant.trialEndsAt) {
    const limit = new Date(restaurant.trialEndsAt);
    return limit > now && limit <= sevenDaysFromNow;
  }
  return false;
}

function getStatusBadge(restaurant: RestaurantRecord) {
  const status = restaurant.status.toLowerCase();
  const now = new Date();
  
  if (status === "active") {
    return <Chip label="Ativa" size="small" color="success" />;
  }
  
  if (status === "trial") {
    if (restaurant.trialEndsAt) {
      const trialLimit = new Date(restaurant.trialEndsAt);
      if (now > trialLimit) {
        return <Chip label="Trial Expirado" size="small" color="error" />;
      }
      const diffTime = trialLimit.getTime() - now.getTime();
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      return <Chip label={`Trial — ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`} size="small" color="warning" />;
    }
    return <Chip label="Trial" size="small" color="warning" />;
  }

  let label = "Expirada";
  if (status === "bloqueada") label = "Bloqueada";
  if (status === "cancelled" || status === "cancelada") label = "Cancelada";
  if (status === "suspended" || status === "suspenso") label = "Suspensa";
  if (status === "overdue") label = "Atrasada";

  return <Chip label={label} size="small" color="error" />;
}

export function RestaurantManager() {
  const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const isEditing = Boolean(form.id);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRestaurant, setDeletingRestaurant] = useState<RestaurantRecord | null>(null);

  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendingRestaurant, setExtendingRestaurant] = useState<RestaurantRecord | null>(null);
  const [daysToExtend, setDaysToExtend] = useState(30);
  const [extendError, setExtendError] = useState<string | null>(null);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRestaurantsAction();
      setRestaurants(data);
    } catch {
      setError("Erro ao carregar restaurantes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(restaurant: RestaurantRecord) {
    setForm({
      id: restaurant.id,
      name: restaurant.name,
      email: "",
      password: "",
      planCode: (restaurant.plan as FormState["planCode"]) || "starter",
      status: (restaurant.status as FormState["status"]) || "trial"
    });
    setError(null);
    setDialogOpen(true);
  }

  function openDelete(restaurant: RestaurantRecord) {
    setDeletingRestaurant(restaurant);
    setError(null);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = form.id
        ? await updateRestaurantAction({
            id: form.id,
            name: form.name,
            planCode: form.planCode,
            status: form.status
          })
        : await createRestaurantAction({
            name: form.name,
            email: form.email,
            password: form.password,
            planCode: form.planCode
          });

      if (!result.ok) {
        setError(result.message ?? "Erro ao salvar restaurante.");
        return;
      }
      setDialogOpen(false);
      fetchRestaurants();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingRestaurant) return;
    setSaving(true);
    setError(null);
    try {
      const result = await deleteRestaurantAction(deletingRestaurant.id);
      if (!result.ok) {
        setError(result.message ?? "Erro ao excluir restaurante.");
        return;
      }
      setDeleteDialogOpen(false);
      setDeletingRestaurant(null);
      fetchRestaurants();
    } finally {
      setSaving(false);
    }
  }

  async function handleExtendSubscription() {
    if (!extendingRestaurant) return;
    setSaving(true);
    setExtendError(null);
    try {
      const result = await extendSubscriptionAction({
        restaurantId: extendingRestaurant.id,
        days: daysToExtend
      });
      if (!result.ok) {
        setExtendError(result.message ?? "Erro ao estender assinatura.");
        return;
      }
      setExtendDialogOpen(false);
      setExtendingRestaurant(null);
      fetchRestaurants();
    } catch (err) {
      setExtendError(err instanceof Error ? err.message : "Erro ao estender assinatura.");
    } finally {
      setSaving(false);
    }
  }

  // Seções críticas calculadas
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const expiringSoon = restaurants.filter((r) => {
    if (r.status.toLowerCase() !== "active") return false;
    if (!r.nextBillingDate) return false;
    const limit = new Date(r.nextBillingDate);
    return limit > now && limit <= sevenDaysFromNow;
  });

  const alreadyExpired = restaurants.filter((r) => {
    if (r.status.toLowerCase() === "trial") return false;
    return isExpired(r);
  });

  const trialExpiring = restaurants.filter((r) => {
    if (r.status.toLowerCase() !== "trial") return false;
    if (!r.trialEndsAt) return false;
    const limit = new Date(r.trialEndsAt);
    return limit <= threeDaysFromNow;
  });

  function getDaysOverdue(r: RestaurantRecord): number {
    if (!r.nextBillingDate) return 0;
    const limit = new Date(r.nextBillingDate);
    if (now <= limit) return 0;
    const diff = now.getTime() - limit.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  return (
    <Box>
      {/* Seção de Resumo/Alertas de Faturamento */}
      {(expiringSoon.length > 0 || alreadyExpired.length > 0 || trialExpiring.length > 0) && (
        <Stack spacing={2} mb={4}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
            Atenção Exigida (Faturamento & Trials)
          </Typography>
          
          <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr 1fr" }} gap={3}>
            {/* 1. Vencem nos próximos 7 dias */}
            <Box sx={{ border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 2, p: 2, bgcolor: "rgba(239, 68, 68, 0.02)" }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "error.main", textTransform: "uppercase" }}>
                Vence em até 7 dias ({expiringSoon.length})
              </Typography>
              {expiringSoon.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Nenhum restaurante.</Typography>
              ) : (
                <Stack spacing={1.5} mt={1.5}>
                  {expiringSoon.map(r => (
                    <Box key={r.id} display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                        <Typography variant="caption" color="text.secondary">Vence em {formatDate(r.nextBillingDate)}</Typography>
                      </Box>
                      {r.adminEmail && (
                        <Button 
                          size="small" 
                          variant="outlined" 
                          href={`mailto:${r.adminEmail}?subject=Sua Assinatura está perto do vencimento`}
                          sx={{ textTransform: "none", py: 0.25, px: 1, fontSize: 11 }}
                        >
                          Contato
                        </Button>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>

            {/* 2. Assinaturas já vencidas */}
            <Box sx={{ border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: 2, p: 2, bgcolor: "rgba(239, 68, 68, 0.04)" }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "error.dark", textTransform: "uppercase" }}>
                Assinaturas Vencidas ({alreadyExpired.length})
              </Typography>
              {alreadyExpired.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Nenhum restaurante.</Typography>
              ) : (
                <Stack spacing={1.5} mt={1.5}>
                  {alreadyExpired.map(r => {
                    const days = getDaysOverdue(r);
                    return (
                      <Box key={r.id} display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                          <Typography variant="caption" color="error.main">Atraso de {days} {days === 1 ? "dia" : "dias"}</Typography>
                        </Box>
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="error"
                          onClick={() => {
                            setExtendingRestaurant(r);
                            setDaysToExtend(30);
                            setExtendError(null);
                            setExtendDialogOpen(true);
                          }}
                          sx={{ textTransform: "none", py: 0.25, px: 1, fontSize: 11 }}
                        >
                          Estender
                        </Button>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>

            {/* 3. Trials expirando em até 3 dias */}
            <Box sx={{ border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 2, p: 2, bgcolor: "rgba(245, 158, 11, 0.02)" }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "warning.main", textTransform: "uppercase" }}>
                Trials Expirando (≤ 3 dias) ({trialExpiring.length})
              </Typography>
              {trialExpiring.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Nenhum restaurante.</Typography>
              ) : (
                <Stack spacing={1.5} mt={1.5}>
                  {trialExpiring.map(r => (
                    <Box key={r.id} display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                        <Typography variant="caption" color="text.secondary">Termina em {formatDate(r.trialEndsAt)}</Typography>
                      </Box>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="warning"
                        onClick={() => {
                          setExtendingRestaurant(r);
                          setDaysToExtend(30);
                          setExtendError(null);
                          setExtendDialogOpen(true);
                        }}
                        sx={{ textTransform: "none", py: 0.25, px: 1, fontSize: 11, color: "common.white" }}
                      >
                        Estender
                      </Button>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        </Stack>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="body2" color="text.secondary">
          {restaurants.length} restaurante{restaurants.length !== 1 ? "s" : ""} cadastrado{restaurants.length !== 1 ? "s" : ""}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={openCreate}
          size="small"
        >
          Novo Restaurante
        </Button>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          {error && !dialogOpen && !deleteDialogOpen && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Código</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Plano Ativo</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Status da Assinatura</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Vence em</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Usuários</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Criado em</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }} align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {restaurants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary", fontSize: 13 }}>
                    Nenhum restaurante cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                restaurants.map((restaurant) => {
                  const planInfo = PLANS_MAP[restaurant.plan.toLowerCase() as keyof typeof PLANS_MAP] || {
                    label: restaurant.plan,
                    color: "default" as const
                  };
                  const expired = isExpired(restaurant);
                  const expiredOrExpiringSoon = isExpiredOrExpiringSoon(restaurant);
                  const isTrial = restaurant.status.toLowerCase() === "trial";

                  let cellColor = "inherit";
                  let cellWeight = "normal";
                  let cellIndicator = "";
                  
                  if (expired) {
                    cellColor = "error.main";
                    cellWeight = "bold";
                    cellIndicator = " 🔴 (Vencida)";
                  } else if (expiredOrExpiringSoon) {
                    cellColor = "warning.main";
                    cellWeight = "bold";
                    cellIndicator = " 🟡 (Urgente)";
                  }

                  return (
                    <TableRow
                      key={restaurant.id}
                      hover
                      sx={{
                        backgroundColor: expiredOrExpiringSoon ? "rgba(239, 68, 68, 0.04)" : "inherit",
                        "&:hover": {
                          backgroundColor: expiredOrExpiringSoon ? "rgba(239, 68, 68, 0.08) !important" : undefined
                        }
                      }}
                    >
                      <TableCell sx={{ fontSize: 13, fontFamily: "monospace", color: "text.secondary" }}>
                        <Tooltip title={restaurant.id}>
                          <span>{restaurant.id.slice(0, 8)}...</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 500 }}>
                        {restaurant.name}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={planInfo.label}
                          size="small"
                          color={planInfo.color}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(restaurant)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: cellColor, fontWeight: cellWeight }}>
                        {formatDate(isTrial ? restaurant.trialEndsAt : restaurant.nextBillingDate)}
                        {cellIndicator}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>
                        {restaurant.userCount}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>
                        {formatDate(restaurant.createdAt)}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => openEdit(restaurant)}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton
                             size="small"
                             color="error"
                             onClick={() => openDelete(restaurant)}
                          >
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Dialog criar / editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? "Editar Restaurante" : "Novo Restaurante"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} mt={1}>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            <TextField
              label="Nome do Restaurante"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              size="small"
              required
              autoFocus
            />

            {!isEditing && (
              <>
                <TextField
                  label="E-mail do Administrador"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  fullWidth
                  size="small"
                  required
                  helperText="Este e-mail será usado para acessar o painel administrativo."
                />

                <TextField
                  label="Senha inicial do Admin"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  fullWidth
                  size="small"
                  required
                  helperText="Mínimo 6 caracteres."
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowPassword((v) => !v)}
                            edge="end"
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </>
            )}

            <FormControl fullWidth size="small" required>
              <InputLabel>Plano</InputLabel>
              <Select
                label="Plano"
                value={form.planCode}
                onChange={(e) => setForm((f) => ({ ...f, planCode: e.target.value as FormState["planCode"] }))}
              >
                <MenuItem value="starter">Starter</MenuItem>
                <MenuItem value="pro">Pro</MenuItem>
                <MenuItem value="enterprise">Enterprise</MenuItem>
              </Select>
            </FormControl>

            {isEditing && (
              <FormControl fullWidth size="small" required>
                <InputLabel>Status da Assinatura</InputLabel>
                <Select
                  label="Status da Assinatura"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState["status"] }))}
                >
                  <MenuItem value="trial">Trial</MenuItem>
                  <MenuItem value="active">Ativo</MenuItem>
                  <MenuItem value="overdue">Em atraso</MenuItem>
                  <MenuItem value="cancelled">Cancelado</MenuItem>
                  <MenuItem value="suspended">Suspenso</MenuItem>
                  <MenuItem value="bloqueada">Bloqueada</MenuItem>
                  <MenuItem value="expirada">Expirada</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} /> : undefined}
          >
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog confirmar exclusão */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir Restaurante</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
          <DialogContentText>
            Tem certeza que deseja excluir o restaurante <strong>{deletingRestaurant?.name}</strong>?
          </DialogContentText>
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary">
              Este restaurante possui <strong>{deletingRestaurant?.userCount}</strong> usuário(s) vinculado(s).
            </Typography>
            <Typography variant="caption" color="error.main" display="block" mt={1}>
              Aviso: Esta ação é irreversível e excluirá todos os dados vinculados (itens, fichas, usuários). A exclusão só será permitida se não houver usuários ativos.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} /> : undefined}
          >
            {saving ? "Excluindo…" : "Excluir"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog estender assinatura */}
      <Dialog open={extendDialogOpen} onClose={() => !saving && setExtendDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Estender Acesso</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} mt={1}>
            {extendError && <Alert severity="error" onClose={() => setExtendError(null)}>{extendError}</Alert>}
            <DialogContentText>
              Estendendo o acesso para o restaurante <strong>{extendingRestaurant?.name}</strong>.
            </DialogContentText>
            <TextField
              label="Dias a Adicionar"
              type="number"
              value={daysToExtend}
              onChange={(e) => setDaysToExtend(parseInt(e.target.value) || 0)}
              fullWidth
              size="small"
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setExtendDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleExtendSubscription}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} /> : undefined}
          >
            {saving ? "Estendendo…" : "Estender"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
