"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { FormSubmitButton } from "@/modules/platform/ui/form-submit-button";
import { registrarRestauranteAction, type RegistroState } from "@/modules/billing/server/billing-actions";
import { PLAN_LIST } from "@/modules/billing/domain/plans";

const PLAN_STYLE: Record<string, string> = {
  starter: "border-orange-200 bg-orange-50 text-orange-700",
  pro: "border-blue-200 bg-blue-50 text-blue-700",
  enterprise: "border-purple-200 bg-purple-50 text-purple-700"
};

const PLAN_SELECTED_RING: Record<string, string> = {
  starter: "ring-2 ring-orange-400",
  pro: "ring-2 ring-blue-500",
  enterprise: "ring-2 ring-purple-500"
};

const initialState: RegistroState = { status: "idle" };

export function RegistroForm() {
  const [state, action] = useActionState(registrarRestauranteAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("pro");

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-4">
        <CheckCircleRoundedIcon sx={{ fontSize: 48, color: "success.main" }} />
        <p className="text-sm text-ink-700 font-medium max-w-xs">{state.message}</p>
        <Link
          href="/login"
          className="mt-2 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.status === "error" && !state.errors && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>{state.message}</Alert>
      )}

      <TextField
        label="Nome do restaurante"
        name="nm_restaurante"
        required
        fullWidth
        size="small"
        error={Boolean(state.errors?.nm_restaurante)}
        helperText={state.errors?.nm_restaurante?.[0]}
      />

      <TextField
        label="Nome do responsável"
        name="nm_responsavel"
        required
        fullWidth
        size="small"
        error={Boolean(state.errors?.nm_responsavel)}
        helperText={state.errors?.nm_responsavel?.[0]}
      />

      <TextField
        label="Email"
        name="email"
        type="email"
        required
        fullWidth
        size="small"
        error={Boolean(state.errors?.email)}
        helperText={state.errors?.email?.[0]}
      />

      <TextField
        label="Senha"
        name="password"
        type={showPassword ? "text" : "password"}
        required
        fullWidth
        size="small"
        error={Boolean(state.errors?.password)}
        helperText={state.errors?.password?.[0] ?? "Mínimo 8 caracteres."}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword
                    ? <VisibilityOffIcon fontSize="small" />
                    : <VisibilityIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            )
          }
        }}
      />

      {/* Seleção de plano */}
      <div>
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">
          Plano — 14 dias grátis, sem cartão agora
        </p>
        <div className="grid grid-cols-3 gap-2">
          {PLAN_LIST.map((plan) => (
            <label
              key={plan.code}
              className={`cursor-pointer rounded-xl border p-3 transition-all ${PLAN_STYLE[plan.code]} ${selectedPlan === plan.code ? PLAN_SELECTED_RING[plan.code] : "opacity-70 hover:opacity-100"}`}
            >
              <input
                type="radio"
                name="plano"
                value={plan.code}
                checked={selectedPlan === plan.code}
                onChange={() => setSelectedPlan(plan.code)}
                className="sr-only"
              />
              <div className="font-bold text-sm">{plan.label}</div>
              <div className="text-xs mt-0.5 font-semibold">
                R$ {plan.monthlyValue}/mês
              </div>
            </label>
          ))}
        </div>
        {state.errors?.plano && (
          <p className="text-xs text-error mt-1">{state.errors.plano[0]}</p>
        )}
      </div>

      <FormSubmitButton
        variant="contained"
        fullWidth
        size="large"
        sx={{
          minHeight: 46,
          backgroundColor: "#185FA5",
          "&:hover": { backgroundColor: "#0C447C" },
          fontWeight: 700
        }}
      >
        Criar conta grátis
      </FormSubmitButton>

      <p className="text-center text-xs text-ink-400">
        Já tem uma conta?{" "}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">
          Fazer login
        </Link>
      </p>
    </form>
  );
}
