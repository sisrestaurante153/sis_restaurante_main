"use client";
 
import { useState, useEffect, useCallback } from "react";
import {
  listUsersAction,
  createUserAction,
  updateUserAction,
  deleteUserAction,
  listRestaurantsAction,
  resetUserPasswordAction
} from "@/modules/access/server/user-management-actions";
import type { UserRecord } from "@/modules/access/server/user-management-repository";
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
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import { PageFeedbackSnackbar } from "@/components/ui/PageFeedbackSnackbar";
 
const ROLES = [
  { value: "super-admin", label: "Super Administrador" },
  { value: "admin", label: "Administrador" },
  { value: "engenharia", label: "Engenharia" },
  { value: "consulta", label: "Consulta" }
];
 
const ROLE_COLORS: Record<string, "error" | "primary" | "secondary" | "default"> = {
  "super-admin": "secondary",
  admin: "error",
  engenharia: "primary",
  consulta: "default"
};
 
type FormState = {
  id?: string;
  name: string;
  email: string;
  password: string;
  roleCode: string;
  active: boolean;
  restaurantId: string;
};
 
const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  roleCode: "engenharia",
  active: true,
  restaurantId: ""
};
 
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}
 
export function UserManager({
  currentUserId,
  roleCodes = [],
  restaurantId
}: {
  currentUserId: string;
  roleCodes?: string[];
  restaurantId?: string | null;
}) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const isEditing = Boolean(form.id);
 
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
 
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string | null; severity: "success" | "error" }>({
    message: null,
    severity: "success"
  });

  const isSuperAdmin = roleCodes.includes("super-admin");
  const visibleRoles = ROLES.filter((r) => r.value !== "super-admin" || isSuperAdmin);
 
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUsersAction();
      setUsers(data);
    } catch {
      setError("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }, []);
 
  const fetchRestaurants = useCallback(async () => {
    try {
      const data = await listRestaurantsAction();
      setRestaurants(data);
    } catch {
      console.error("Erro ao carregar restaurantes.");
    }
  }, []);
 
  useEffect(() => {
    fetchUsers();
    fetchRestaurants();
  }, [fetchUsers, fetchRestaurants]);
 
  function openCreate() {
    setForm({
      ...EMPTY_FORM,
      restaurantId: restaurantId || ""
    });
    setShowPassword(false);
    setError(null);
    setDialogOpen(true);
  }
 
  function openEdit(user: UserRecord) {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      roleCode: user.roleCode ?? "consulta",
      active: user.active,
      restaurantId: user.restaurantId ?? ""
    });
    setError(null);
    setDialogOpen(true);
  }
 
  function openDelete(user: UserRecord) {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  }
 
  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = form.id
        ? await updateUserAction({
            id: form.id,
            name: form.name,
            roleCode: form.roleCode,
            active: form.active,
            restaurantId: form.restaurantId || null
          })
        : await createUserAction({
            name: form.name,
            email: form.email,
            password: form.password,
            roleCode: form.roleCode,
            restaurantId: form.restaurantId || null
          });
 
      if (!result.ok) {
        setError(result.message ?? "Erro ao salvar usuário.");
        return;
      }
      setDialogOpen(false);
      fetchUsers();
    } finally {
      setSaving(false);
    }
  }
 
  async function handleDelete() {
    if (!deletingUser) return;
    setSaving(true);
    try {
      const result = await deleteUserAction(deletingUser.id);
      if (!result.ok) {
        setError(result.message ?? "Erro ao excluir usuário.");
        setDeleteDialogOpen(false);
        return;
      }
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      fetchUsers();
    } finally {
      setSaving(false);
    }
  }
 
  function openResetPassword(user: UserRecord) {
    setResettingUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowResetPassword(false);
    setResetError(null);
    setResetDialogOpen(true);
  }

  async function handleResetPassword() {
    if (!resettingUser) return;

    if (newPassword.length < 6) {
      setResetError("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    setResetError(null);
    try {
      const result = await resetUserPasswordAction({
        userId: resettingUser.id,
        newPassword: newPassword
      });

      if (!result.ok) {
        setResetError(result.message ?? "Erro ao resetar senha.");
        setFeedback({
          message: result.message ?? "Erro ao resetar senha.",
          severity: "error"
        });
        return;
      }

      setFeedback({
        message: "Senha resetada com sucesso. O usuário precisará usar a nova senha no próximo login.",
        severity: "success"
      });
      setResetDialogOpen(false);
      setResettingUser(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao resetar senha.";
      setResetError(msg);
      setFeedback({
        message: msg,
        severity: "error"
      });
    } finally {
      setSaving(false);
    }
  }
 
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="body2" color="text.secondary">
          {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={openCreate}
          size="small"
        >
          Novo Usuário
        </Button>
      </Stack>
 
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>E-mail</TableCell>
                {isSuperAdmin && (
                  <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Restaurante</TableCell>
                )}
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Perfil</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Criado em</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }} align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary", fontSize: 13 }}>
                    Nenhum usuário cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell sx={{ fontSize: 13, fontWeight: 500 }}>
                      {user.name}
                      {user.id === currentUserId && (
                        <Typography component="span" variant="caption" color="text.secondary" ml={0.75}>
                          (você)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: "text.secondary" }}>{user.email}</TableCell>
                    {isSuperAdmin && (
                      <TableCell sx={{ fontSize: 13 }}>
                        {user.restaurantName ? (
                          user.restaurantName
                        ) : (
                          <Typography component="span" sx={{ color: "error.main", fontWeight: "bold", fontSize: 13 }}>
                            Sem vínculo
                          </Typography>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Chip
                        label={ROLES.find((r) => r.value === user.roleCode)?.label ?? user.roleCode ?? "—"}
                        size="small"
                        color={ROLE_COLORS[user.roleCode ?? ""] ?? "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.active ? "Ativo" : "Inativo"}
                        size="small"
                        color={user.active ? "success" : "default"}
                        variant={user.active ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>{formatDate(user.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(user)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {((roleCodes.includes("admin") || roleCodes.includes("super-admin")) && user.id !== currentUserId) && (
                        <Tooltip title="Resetar Senha">
                          <IconButton size="small" onClick={() => openResetPassword(user)}>
                            <LockRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={user.id === currentUserId ? "Não é possível excluir sua própria conta" : "Excluir"}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => openDelete(user)}
                            disabled={user.id === currentUserId}
                          >
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      )}
 
      {/* Dialog criar / editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} mt={1}>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
 
            <TextField
              label="Nome"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              size="small"
              required
              autoFocus
            />
 
            <TextField
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
              size="small"
              required
              disabled={isEditing}
              helperText={isEditing ? "O e-mail não pode ser alterado." : undefined}
            />
 
            {isSuperAdmin && (
              <FormControl fullWidth size="small">
                <InputLabel>Restaurante</InputLabel>
                <Select
                  label="Restaurante"
                  value={form.restaurantId}
                  onChange={(e) => setForm((f) => ({ ...f, restaurantId: e.target.value }))}
                >
                  <MenuItem value="">
                    <Typography component="span" sx={{ color: "error.main", fontWeight: "bold" }}>
                      Sem vínculo
                    </Typography>
                  </MenuItem>
                  {restaurants.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
 
            {!isEditing && (
              <TextField
                label="Senha inicial"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                fullWidth
                size="small"
                required
                helperText="Mínimo 6 caracteres. O usuário pode alterar depois."
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
            )}
 
            <FormControl fullWidth size="small" required>
              <InputLabel>Perfil</InputLabel>
              <Select
                label="Perfil"
                value={form.roleCode}
                onChange={(e) => setForm((f) => ({ ...f, roleCode: e.target.value }))}
              >
                {visibleRoles.map((r) => (
                  <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {form.roleCode === "super-admin" && (
              <Alert severity="warning" variant="outlined">
                Atenção: este usuário terá acesso total à plataforma, incluindo dados de todos os restaurantes.
              </Alert>
            )}
 
            {isEditing && (
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={form.active ? "ativo" : "inativo"}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === "ativo" }))}
                >
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
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
        <DialogTitle>Excluir usuário</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir <strong>{deletingUser?.name}</strong>? Esta ação não pode ser desfeita.
          </DialogContentText>
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
 
      {/* Dialog resetar senha */}
      <Dialog open={resetDialogOpen} onClose={() => !saving && setResetDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Resetar Senha</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} mt={1}>
            <DialogContentText>
              Deseja resetar a senha de <strong>{resettingUser?.name}</strong>?
            </DialogContentText>

            {resetError && <Alert severity="error" onClose={() => setResetError(null)}>{resetError}</Alert>}

            <TextField
              label="Nova Senha"
              type={showResetPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
                        onClick={() => setShowResetPassword((v) => !v)}
                        edge="end"
                        aria-label={showResetPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showResetPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />

            <TextField
              label="Confirmar Nova Senha"
              type={showResetPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              size="small"
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setResetDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} /> : undefined}
          >
            {saving ? "Resetando…" : "Resetar senha"}
          </Button>
        </DialogActions>
      </Dialog>

      <PageFeedbackSnackbar message={feedback.message} severity={feedback.severity} />
    </Box>
  );
}
