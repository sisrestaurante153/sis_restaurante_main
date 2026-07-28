"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { deleteVendaAction, saveVendaAction } from "@/modules/sales/server/sales-actions";
import type { VendaRow } from "@/modules/sales/domain/types";

interface SalesListingViewProps {
  vendas: VendaRow[];
  itemOptions: Array<{ id: string; name: string }>;
}

export function SalesListingView({ vendas, itemOptions }: SalesListingViewProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          Registrar venda
        </Typography>
        <Stack component="form" action={saveVendaAction} direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField select size="small" label="Item" name="itemId" defaultValue="" sx={{ minWidth: 220 }} required>
            {itemOptions.length === 0 ? (
              <MenuItem value="" disabled>
                Nenhum item vendável cadastrado
              </MenuItem>
            ) : (
              itemOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))
            )}
          </TextField>
          <TextField
            size="small"
            label="Data"
            name="date"
            type="date"
            defaultValue={today}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 170 }}
            required
          />
          <TextField
            size="small"
            label="Quantidade"
            name="quantity"
            type="number"
            defaultValue="1"
            slotProps={{ htmlInput: { step: "0.01" } }}
            sx={{ width: 130 }}
            required
          />
          <TextField
            size="small"
            label="Preço unitário"
            name="unitPrice"
            type="number"
            slotProps={{ htmlInput: { step: "0.01" } }}
            sx={{ width: 150 }}
            required
          />
          <TextField size="small" label="Canal (opcional)" name="channel" placeholder="salão, delivery..." sx={{ width: 170 }} />
          <Button
            type="submit"
            variant="contained"
            sx={{ backgroundColor: "#185FA5", "&:hover": { backgroundColor: "#0C447C" } }}
          >
            Registrar
          </Button>
        </Stack>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Data</TableCell>
            <TableCell>Item</TableCell>
            <TableCell align="right">Quantidade</TableCell>
            <TableCell align="right">Preço unitário</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell>Canal</TableCell>
            <TableCell>Origem</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {vendas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                  Nenhuma venda registrada ainda.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            vendas.map((venda) => (
              <TableRow key={venda.id}>
                <TableCell>{new Date(`${venda.date}T00:00:00`).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>{venda.itemName}</TableCell>
                <TableCell align="right">{Number(venda.quantity).toLocaleString("pt-BR")}</TableCell>
                <TableCell align="right">R$ {Number(venda.unitPrice).toFixed(2)}</TableCell>
                <TableCell align="right">R$ {Number(venda.total).toFixed(2)}</TableCell>
                <TableCell>{venda.channel ?? "--"}</TableCell>
                <TableCell>{venda.origin}</TableCell>
                <TableCell align="right">
                  <form action={deleteVendaAction}>
                    <input type="hidden" name="vendaId" value={venda.id} />
                    <IconButton aria-label={`Remover venda de ${venda.itemName}`} size="small" type="submit">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </form>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Stack>
  );
}
