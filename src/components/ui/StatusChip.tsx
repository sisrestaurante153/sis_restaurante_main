import Chip from "@mui/material/Chip";

interface StatusChipProps {
  status: string;
  hexColors?: { bg: string; text: string; border?: string };
}

function resolveChipColor(status: string) {
  const normalized = status.trim().toLowerCase();

  if (["ativo", "ativa", "concluido", "concluida", "ok"].includes(normalized)) {
    return "success";
  }

  if (["pendente", "pendencias", "rascunho", "aguardando"].includes(normalized)) {
    return "warning";
  }

  if (["erro", "falha", "cancelado", "cancelada"].includes(normalized)) {
    return "error";
  }

  if (["arquivado", "arquivada", "inativo", "inativa"].includes(normalized)) {
    return "default";
  }

  return "info";
}

// Phase 09-02 D-16: tokens pixel-perfect do HTML update/tela-item-v1.html linha 44.
// Badge ativo verde; badge inativo cinza neutro (nao vermelho — reservado para erros).
function resolveHexTokens(status: string): { bg: string; text: string; border: string } | null {
  const normalized = status.trim().toLowerCase();
  if (["ativo", "ativa"].includes(normalized)) {
    return { bg: "#EAF3DE", text: "#1B6B2C", border: "#C0DD97" };
  }
  if (["inativo", "inativa"].includes(normalized)) {
    return { bg: "#F4F4F2", text: "#888780", border: "#D3D1C7" };
  }
  return null;
}

export function StatusChip({ status, hexColors }: StatusChipProps) {
  const resolvedHex = hexColors ?? resolveHexTokens(status);
  if (resolvedHex) {
    return (
      <Chip
        size="small"
        label={status}
        variant="filled"
        sx={{
          backgroundColor: resolvedHex.bg,
          color: resolvedHex.text,
          border: `0.5px solid ${resolvedHex.border ?? resolvedHex.bg}`,
          fontSize: 11,
          fontWeight: 500,
          height: "auto",
          padding: "2px 9px",
          borderRadius: "20px",
          "& .MuiChip-label": {
            padding: 0
          }
        }}
      />
    );
  }

  return <Chip size="small" label={status} color={resolveChipColor(status)} variant="outlined" />;
}
