"use client";

import { useState } from "react";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import { FormSubmitButton } from "@/modules/platform/ui/form-submit-button";
import { withBasePath } from "@/modules/platform/lib/base-path";

export function SignupForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setMessage(null);

    const nome = formData.get("nome")?.toString() ?? "";
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";

    // For now, using a fetch to a future signup API or just a direct action
    // In a real scenario, we'd call a Server Action
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar conta.");
      }

      setSuccess(true);
      window.location.assign(withBasePath("/dashboard"));
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <Stack spacing={2} textAlign="center">
        <Alert severity="success">Conta criada com sucesso! Redirecionando...</Alert>
      </Stack>
    );
  }

  return (
    <form action={handleSubmit}>
      <Stack spacing={2.5}>
        {message ? <Alert severity="error">{message}</Alert> : null}

        <TextField
          label="Nome Completo"
          name="nome"
          required
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineIcon color="action" fontSize="small" />
                </InputAdornment>
              )
            }
          }}
        />

        <TextField
          label="Email"
          name="email"
          type="email"
          required
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon color="action" fontSize="small" />
                </InputAdornment>
              )
            }
          }}
        />

        <TextField
          label="Senha"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          fullWidth
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
        />

        <FormSubmitButton
          disabled={pending}
          variant="contained"
          fullWidth
          size="large"
          sx={{ minHeight: 48 }}
        >
          Criar conta
        </FormSubmitButton>

        <Stack direction="row" justifyContent="center" spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Já tem uma conta?
          </Typography>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <Typography variant="body2" color="primary">Fazer login</Typography>
          </Link>
        </Stack>
      </Stack>
    </form>
  );
}
