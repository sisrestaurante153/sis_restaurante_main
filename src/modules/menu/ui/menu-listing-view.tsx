"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { CardapioSummary } from "@/modules/menu/domain/types";

interface MenuListingViewProps {
  cardapios: CardapioSummary[];
}

export function MenuListingView({ cardapios }: MenuListingViewProps) {
  if (cardapios.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            Nenhum cardápio cadastrado ainda. Crie o primeiro para começar a organizar preços por canal.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={1.5}>
      {cardapios.map((cardapio) => (
        <Card key={cardapio.id} variant="outlined">
          <CardContent
            component={Link}
            href={`/cardapios/${cardapio.id}` as never}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textDecoration: "none",
              color: "inherit",
              "&:hover": { backgroundColor: "action.hover" }
            }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {cardapio.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {cardapio.itemCount} {cardapio.itemCount === 1 ? "item" : "itens"}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={cardapio.channel} />
              <Chip
                size="small"
                label={cardapio.active ? "Ativo" : "Inativo"}
                color={cardapio.active ? "success" : "default"}
                variant="outlined"
              />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
