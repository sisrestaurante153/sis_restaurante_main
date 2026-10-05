"use client";

import { useState } from "react";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { PendingFichaItem } from "@/modules/engineering/server/ficha-link-repository";
import { VincularFichaDialog } from "@/modules/engineering/ui/VincularFichaDialog";

interface PendingFichasListProps {
  items: PendingFichaItem[];
}

export function PendingFichasList({ items }: PendingFichasListProps) {
  const [selectedItem, setSelectedItem] = useState<PendingFichaItem | null>(null);

  if (items.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          Nenhum item pendente - todos os itens vendaveis ja tem ficha tecnica ativa.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Melhor candidata</TableCell>
              <TableCell align="right">Acao</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const best = item.candidates[0];
              return (
                <TableRow key={item.itemId} hover>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.itemType} />
                  </TableCell>
                  <TableCell>
                    {best ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">{best.itemName}</Typography>
                        <Chip
                          size="small"
                          color={best.strength === "forte" ? "success" : "warning"}
                          label={best.strength === "forte" ? "match forte" : "match fraco"}
                        />
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Sem sugestao
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {item.candidates.length > 0 ? (
                      <Button size="small" variant="outlined" onClick={() => setSelectedItem(item)}>
                        Vincular
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        component={NextLink}
                        href={`/fichas/nova?itemId=${item.itemId}`}
                        variant="text"
                      >
                        Criar do zero
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          {items.length} {items.length === 1 ? "item pendente" : "itens pendentes"}
        </Typography>
      </Box>

      <VincularFichaDialog open={Boolean(selectedItem)} item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
}
