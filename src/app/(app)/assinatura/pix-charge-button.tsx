"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { gerarCobrancaPixAction, type GerarCobrancaPixState } from "@/modules/billing/server/billing-actions";

export function PixChargeButton({
  subscriptionId,
  email
}: {
  subscriptionId: string;
  email: string;
}) {
  const [state, setState] = useState<GerarCobrancaPixState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await gerarCobrancaPixAction(subscriptionId, email);
      setState(result);
    });
  }

  if (state.status === "success" && state.qrCodeBase64) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-ink-200 p-4 text-center">
        <p className="text-sm font-semibold text-blue-900">Pague com o app do seu banco</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${state.qrCodeBase64}`}
          alt="QR Code do PIX"
          className="w-40 h-40"
        />
        {state.qrCode && (
          <textarea
            readOnly
            value={state.qrCode}
            className="w-full text-xs text-ink-500 bg-ink-50 rounded-lg p-2 resize-none"
            rows={3}
            onClick={(e) => e.currentTarget.select()}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {state.status === "error" && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>{state.message}</Alert>
      )}
      <Button
        variant="outlined"
        fullWidth
        disabled={isPending}
        onClick={handleClick}
        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
      >
        {isPending ? "Gerando cobrança..." : "Gerar cobrança PIX deste mês"}
      </Button>
    </div>
  );
}
