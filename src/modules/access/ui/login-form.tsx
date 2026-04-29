"use client";

import { useState } from "react";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { withBasePath } from "@/modules/platform/lib/base-path";
import { FormSubmitButton } from "@/modules/platform/ui/form-submit-button";

export function LoginForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setMessage(null);

    const response = await fetch(withBasePath("/api/auth/login"), {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        email: formData.get("email")?.toString() ?? "",
        password: formData.get("password")?.toString() ?? ""
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setMessage(payload?.message ?? "Nao foi possivel autenticar.");
      setPending(false);
      return;
    }

    window.location.assign(withBasePath("/dashboard"));
  }

  return (
    <form
      action={async (formData) => {
        await handleSubmit(formData);
      }}
    >
      <Stack spacing={2.5}>
        {message ? <Alert severity="error">{message}</Alert> : null}

        <TextField
          label="Email"
          name="email"
          type="email"
          fullWidth
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@sis-restaurante.local"
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
          fullWidth
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="admin123"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
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
          Entrar no painel
        </FormSubmitButton>
      </Stack>
    </form>
  );
}
