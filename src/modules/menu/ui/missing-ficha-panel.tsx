import Link from "next/link";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { CardapioItemRow } from "@/modules/menu/domain/types";

const TYPE_LABEL: Record<string, string> = {
  prato: "Prato",
  porcao: "Porção",
  marmita: "Marmita",
  combo: "Combo",
  produto_pronto: "Produto pronto"
};

export function MissingFichaPanel({ items }: { items: CardapioItemRow[] }) {
  const missing = items.filter((item) => !item.hasFichaTecnica);

  if (missing.length === 0) return null;

  return (
    <Box sx={{ border: "0.5px solid #F0C36D", borderRadius: 2, bgcolor: "#FDF6E8", p: 2.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <WarningAmberOutlinedIcon sx={{ color: "#854F0B", fontSize: 20, mt: 0.2 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#5B3A0A" }}>
            {missing.length} {missing.length === 1 ? "item deste cardápio ainda não tem" : "itens deste cardápio ainda não têm"} ficha técnica
          </Typography>
          <Typography sx={{ fontSize: 12, color: "#854F0B", mt: 0.25, mb: 1.5 }}>
            Sem ficha técnica o custo real desse item não é calculado — só o preço de venda cadastrado.
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              maxHeight: 260,
              overflowY: "auto"
            }}
          >
            {missing.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  px: 1.25,
                  py: 0.75,
                  borderRadius: "6px",
                  bgcolor: "#fff",
                  border: "0.5px solid #EEDCAE"
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Box
                    component="span"
                    sx={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: "#5F5E5A",
                      bgcolor: "#F1EFE8",
                      borderRadius: "4px",
                      px: 0.75,
                      py: 0.15,
                      whiteSpace: "nowrap"
                    }}
                  >
                    {TYPE_LABEL[item.itemType] ?? item.itemType}
                  </Box>
                  <Typography sx={{ fontSize: 12.5, color: "#2C2C2A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.itemName}
                  </Typography>
                </Stack>
                <Link
                  href={`/fichas/nova?itemId=${item.itemId}` as never}
                  style={{ fontSize: 11.5, color: "#185FA5", textDecoration: "none", whiteSpace: "nowrap", fontWeight: 500 }}
                >
                  + Criar ficha
                </Link>
              </Box>
            ))}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
