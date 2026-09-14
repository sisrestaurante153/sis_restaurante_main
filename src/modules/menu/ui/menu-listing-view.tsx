"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { StatusChip } from "@/components/ui/StatusChip";
import type { CardapioSummary } from "@/modules/menu/domain/types";

interface MenuListingViewProps {
  cardapios: CardapioSummary[];
}

const CHANNEL_LABEL: Record<string, string> = {
  salao: "Salão",
  delivery: "Delivery",
  ambos: "Salão e delivery"
};

const CHANNEL_COLORS: Record<string, { bg: string; text: string }> = {
  salao: { bg: "#E6F1FB", text: "#0C447C" },
  delivery: { bg: "#EEEDFE", text: "#3C3489" },
  ambos: { bg: "#FAEEDA", text: "#633806" }
};

function ChannelBadge({ channel }: { channel: string }) {
  const colors = CHANNEL_COLORS[channel] ?? { bg: "#F1EFE8", text: "#444441" };
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        fontSize: 10.5,
        padding: "2px 8px",
        borderRadius: "4px",
        fontWeight: 500,
        whiteSpace: "nowrap",
        bgcolor: colors.bg,
        color: colors.text
      }}
    >
      {CHANNEL_LABEL[channel] ?? channel}
    </Box>
  );
}

export function MenuListingView({ cardapios }: MenuListingViewProps) {
  return (
    <Box
      sx={{
        overflowX: "auto",
        border: "0.5px solid #D3D1C7",
        borderRadius: 2,
        bgcolor: "#fff"
      }}
    >
      <Table size="small" sx={{ minWidth: 560 }}>
        <TableHead>
          <TableRow sx={{ "& th": { bgcolor: "#F4F4F2", fontSize: 11.5, fontWeight: 600, color: "#5F5E5A", borderBottom: "0.5px solid #D3D1C7" } }}>
            <TableCell>Nome</TableCell>
            <TableCell>Canal</TableCell>
            <TableCell align="right">Itens</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {cardapios.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                  Nenhum cardápio cadastrado ainda. Crie o primeiro para começar a organizar preços por canal.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            cardapios.map((cardapio) => (
              <TableRow
                key={cardapio.id}
                hover
                sx={{ "& td": { p: 0, fontSize: 13, borderBottom: "0.5px solid #EDEBE3" } }}
              >
                <TableCell>
                  <Link
                    href={`/cardapios/${cardapio.id}` as never}
                    style={{ display: "block", textDecoration: "none", color: "#2C2C2A", padding: "10px 16px", fontWeight: 500 }}
                  >
                    {cardapio.name}
                  </Link>
                </TableCell>
                <TableCell sx={{ px: 2 }}>
                  <ChannelBadge channel={cardapio.channel} />
                </TableCell>
                <TableCell align="right" sx={{ px: 2, color: "#5F5E5A" }}>
                  {cardapio.itemCount}
                </TableCell>
                <TableCell sx={{ px: 2 }}>
                  <StatusChip status={cardapio.active ? "Ativo" : "Inativo"} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
