"use client";

import { useActionState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import { FormSubmitButton } from "@/modules/platform/ui/form-submit-button";
import { ativarAssinaturaAction, type AtivarAssinaturaState } from "@/modules/billing/server/billing-actions";

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

  useEffect(() => {
    if (state.status === "success" && state.initPoint) {
      window.location.href = state.initPoint;
    }
  }, [state]);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-6">
        <p className="font-semibold text-blue-900 text-lg">Redirecionando...</p>
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

      <p className="text-xs text-ink-400">
        Você será redirecionado ao checkout seguro do Mercado Pago para informar os dados do cartão.
      </p>

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
