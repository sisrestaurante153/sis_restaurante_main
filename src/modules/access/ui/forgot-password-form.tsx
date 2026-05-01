"use client";

import { useState } from "react";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import { FormSubmitButton } from "@/modules/platform/ui/form-submit-button";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setMessage(null);

    const email = formData.get("email")?.toString() ?? "";

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao processar solicitação.");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <Stack spacing={2} textAlign="center">
        <Alert severity="success">Se o email estiver cadastrado, você receberá um link de recuperação.</Alert>
        <Link href="/login" style={{ textDecoration: 'none' }}>
           <Typography variant="body2" color="primary">Voltar para o login</Typography>
        </Link>
      </Stack>
    );
  }

  return (
    <form action={handleSubmit}>
      <Stack spacing={2.5}>
        <Typography variant="body2" color="text.secondary">
          Informe seu email para receber as instruções de recuperação de senha.
        </Typography>

        {message ? <Alert severity="error">{message}</Alert> : null}

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

        <FormSubmitButton
          disabled={pending}
          variant="contained"
          fullWidth
          size="large"
          sx={{ minHeight: 48 }}
        >
          Enviar link
        </FormSubmitButton>

        <Stack direction="row" justifyContent="center">
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <Typography variant="body2" color="primary">Voltar para o login</Typography>
          </Link>
        </Stack>
      </Stack>
    </form>
  );
}
