"use client";

import { useActionState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { saveCardapioAction, type MenuFormState } from "@/modules/menu/server/menu-actions";

const CHANNEL_OPTIONS = ["salao", "delivery", "ambos"];

const CHANNEL_LABEL: Record<string, string> = {
  salao: "Salão",
  delivery: "Delivery",
  ambos: "Salão e delivery"
};

interface CardapioFormProps {
  formId?: string;
  initialValues?: {
    id: string;
    name: string;
    channel: string;
    active: boolean;
  };
}

export function CardapioForm({ formId = "cardapio-form", initialValues }: CardapioFormProps) {
  const [state, formAction] = useActionState(saveCardapioAction, { status: "idle" } satisfies MenuFormState);

  return (
    <Stack component="form" id={formId} action={formAction} spacing={2.5}>
      <input type="hidden" name="id" value={initialValues?.id ?? ""} />

      {state.status === "error" && state.message ? <Alert severity="error">{state.message}</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr 1fr" }, gap: 2 }}>
        <TextField
          required
          fullWidth
          size="small"
          label="Nome do cardápio"
          name="name"
          defaultValue={initialValues?.name ?? ""}
          placeholder="Ex.: Cardápio Executivo"
        />
        <TextField
          fullWidth
          select
          size="small"
          label="Canal"
          name="channel"
          defaultValue={initialValues?.channel ?? "salao"}
        >
          {CHANNEL_OPTIONS.map((channel) => (
            <MenuItem key={channel} value={channel}>
              {CHANNEL_LABEL[channel] ?? channel}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          select
          size="small"
          label="Status"
          name="active"
          defaultValue={initialValues?.active === false ? "false" : "true"}
        >
          <MenuItem value="true">Ativo</MenuItem>
          <MenuItem value="false">Inativo</MenuItem>
        </TextField>
      </Box>

      <Box>
        <Button
          type="submit"
          form={formId}
          variant="contained"
          sx={{ backgroundColor: "#185FA5", "&:hover": { backgroundColor: "#0C447C" } }}
        >
          Salvar cardápio
        </Button>
      </Box>
    </Stack>
  );
}
