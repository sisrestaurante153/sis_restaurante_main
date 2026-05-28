"use client";

import { useActionState, useState, useRef, useEffect } from "react";
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
import { type Plan, PLAN_LIST } from "@/modules/billing/domain/plans";

const PLAN_STYLE: Record<string, string> = {
  starter: "border-orange-200 bg-orange-50 text-orange-700",
  pro: "border-teal-200 bg-teal-50 text-teal-700",
  enterprise: "border-purple-200 bg-purple-50 text-purple-700"
};

const PLAN_SELECTED_RING: Record<string, string> = {
  starter: "ring-2 ring-orange-400",
  pro: "ring-2 ring-teal-500",
  enterprise: "ring-2 ring-purple-500"
};

const initialState: RegistroState = { status: "idle" };

export function RegistroForm({ plans }: { plans?: Plan[] }) {
  const [state, action] = useActionState(registrarRestauranteAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  
  // Campos controlados
  const [nmRestaurante, setNmRestaurante] = useState("");
  const [nmResponsavel, setNmResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Referências para foco e scroll
  const restauranteRef = useRef<HTMLInputElement>(null);
  const responsavelRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const planList = plans && plans.length > 0 ? plans : PLAN_LIST;
  const [selectedPlan, setSelectedPlan] = useState(planList[1]?.code || planList[0]?.code || "pro");

  // Rola até o primeiro campo com erro e foca nele
  useEffect(() => {
    if (state.status === "error" && state.errors) {
      if (state.errors.nm_restaurante) {
        restauranteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        restauranteRef.current?.focus();
      } else if (state.errors.nm_responsavel) {
        responsavelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        responsavelRef.current?.focus();
      } else if (state.errors.email) {
        emailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        emailRef.current?.focus();
      } else if (state.errors.password) {
        passwordRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        passwordRef.current?.focus();
      }
    }
  }, [state]);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-4">
        <CheckCircleRoundedIcon sx={{ fontSize: 48, color: "success.main" }} />
        <p className="text-sm text-ink-700 font-medium max-w-xs">
          Conta criada com sucesso! Redirecionando para o painel...
        </p>
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
        value={nmRestaurante}
        onChange={(e) => setNmRestaurante(e.target.value)}
        inputRef={restauranteRef}
        required
        fullWidth
        size="small"
        error={Boolean(state.errors?.nm_restaurante)}
        helperText={state.errors?.nm_restaurante?.[0]}
      />

      <TextField
        label="Nome do responsável"
        name="nm_responsavel"
        value={nmResponsavel}
        onChange={(e) => setNmResponsavel(e.target.value)}
        inputRef={responsavelRef}
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
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        inputRef={emailRef}
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
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        inputRef={passwordRef}
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
          {planList.map((plan) => (
            <label
              key={plan.code}
              className={`cursor-pointer rounded-xl border p-3 transition-all ${PLAN_STYLE[plan.code] || "border-gray-200 bg-gray-50 text-gray-700"} ${selectedPlan === plan.code ? (PLAN_SELECTED_RING[plan.code] || "ring-2 ring-gray-400") : "opacity-70 hover:opacity-100"}`}
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
