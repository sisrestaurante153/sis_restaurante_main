"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listUsersAction,
  createUserAction,
  updateUserAction,
  deleteUserAction
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

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "engenharia", label: "Engenharia" },
  { value: "consulta", label: "Consulta" }
];

const ROLE_COLORS: Record<string, "error" | "primary" | "default"> = {
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
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  roleCode: "engenharia",
  active: true
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function UserManager({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const isEditing = Boolean(form.id);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);

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

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function openCreate() {
    setForm(EMPTY_FORM);
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
      active: user.active
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
        ? await updateUserAction({ id: form.id, name: form.name, roleCode: form.roleCode, active: form.active })
        : await createUserAction({ name: form.name, email: form.email, password: form.password, roleCode: form.roleCode });

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
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Perfil</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>Criado em</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }} align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary", fontSize: 13 }}>
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
                {ROLES.map((r) => (
                  <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

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
    </Box>
  );
}
