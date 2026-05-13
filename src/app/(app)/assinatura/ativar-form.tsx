"use client";

import { useActionState } from "react";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import { FormSubmitButton } from "@/modules/platform/ui/form-submit-button";
import { ativarAssinaturaAction, type AtivarAssinaturaState } from "@/modules/billing/server/billing-actions";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

const initialState: AtivarAssinaturaState = { status: "idle" };

export function AtivarAssinaturaForm({
  subscriptionId,
  email,
  planLabel,
  monthlyValue
}: {
  subscriptionId: string;
  email: string;
  planLabel: string;
  monthlyValue: number;
}) {
  const [state, action] = useActionState(ativarAssinaturaAction, initialState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-6">
        <CheckCircleRoundedIcon sx={{ fontSize: 52, color: "success.main" }} />
        <p className="font-semibold text-blue-900 text-lg">Assinatura ativada!</p>
        <p className="text-sm text-ink-500 max-w-xs">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="subscriptionId" value={subscriptionId} />

      {state.status === "error" && !state.errors && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>{state.message}</Alert>
      )}

      <TextField
        label="Nome completo"
        name="nomeCliente"
        required
        fullWidth
        size="small"
        error={Boolean(state.errors?.nomeCliente)}
        helperText={state.errors?.nomeCliente?.[0]}
      />

      <TextField
        label="Email"
        name="email"
        type="email"
        required
        fullWidth
        size="small"
        defaultValue={email}
        error={Boolean(state.errors?.email)}
        helperText={state.errors?.email?.[0]}
      />

      <TextField
        label="CPF ou CNPJ"
        name="cpfCnpj"
        required
        fullWidth
        size="small"
        placeholder="000.000.000-00"
        error={Boolean(state.errors?.cpfCnpj)}
        helperText={state.errors?.cpfCnpj?.[0] ?? "Somente números"}
      />

      {/* Forma de pagamento */}
      <div>
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">
          Forma de pagamento
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "PIX", label: "Pix", desc: "Desconto de 5%" },
            { value: "CREDIT_CARD", label: "Cartão de crédito", desc: "Até 12x" }
          ].map((opt) => (
            <label
              key={opt.value}
              className="cursor-pointer rounded-xl border border-ink-200 p-3 hover:border-blue-400 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 transition-all"
            >
              <input type="radio" name="paymentMethod" value={opt.value} className="sr-only" defaultChecked={opt.value === "PIX"} />
              <div className="font-semibold text-sm text-blue-900">{opt.label}</div>
              <div className="text-xs text-ink-500 mt-0.5">{opt.desc}</div>
            </label>
          ))}
        </div>
        {state.errors?.paymentMethod && (
          <p className="text-xs text-error mt-1">{state.errors.paymentMethod[0]}</p>
        )}
      </div>

      <div className="bg-ink-50 rounded-xl p-4 text-sm">
        <div className="flex justify-between text-ink-600">
          <span>Plano {planLabel}</span>
          <span className="font-semibold text-blue-900">
            R$ {monthlyValue.toFixed(2).replace(".", ",")}/mês
          </span>
        </div>
        <p className="text-xs text-ink-400 mt-1">Cobrado mensalmente. Cancele quando quiser.</p>
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
        Ativar assinatura
      </FormSubmitButton>
    </form>
  );
}
