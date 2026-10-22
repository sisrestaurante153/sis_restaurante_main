"use client";

import { useActionState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { FormSection } from "@/components/ui/FormSection";
import { saveCardapioAction, type MenuFormState } from "@/modules/menu/server/menu-actions";

interface ChannelOption {
  code: string;
  name: string;
}

interface CardapioFormProps {
  formId?: string;
  initialValues?: {
    id: string;
    name: string;
    channel: string;
    active: boolean;
  };
  channelOptions: ChannelOption[];
}

export function CardapioForm({ formId = "cardapio-form", initialValues, channelOptions }: CardapioFormProps) {
  const [state, formAction] = useActionState(saveCardapioAction, { status: "idle" } satisfies MenuFormState);

  return (
    <FormSection
      title="Dados do cardápio"
      description="Nome, canal de venda e status."
      actions={
        <Button
          type="submit"
          form={formId}
          variant="contained"
          sx={{ backgroundColor: "#185FA5", "&:hover": { backgroundColor: "#0C447C" } }}
        >
          Salvar cardápio
        </Button>
      }
    >
      <Box component="form" id={formId} action={formAction}>
        <input type="hidden" name="id" value={initialValues?.id ?? ""} />

        {state.status === "error" && state.message ? (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            {state.message}
          </Alert>
        ) : null}

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
            defaultValue={initialValues?.channel ?? channelOptions[0]?.code ?? "salao"}
          >
            {channelOptions.map((channel) => (
              <MenuItem key={channel.code} value={channel.code}>
                {channel.name}
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
      </Box>
    </FormSection>
  );
}
