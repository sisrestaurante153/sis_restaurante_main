"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
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
import { addCardapioItemAction, removeCardapioItemAction } from "@/modules/menu/server/menu-actions";
import { WEEKDAY_LABELS, type CardapioItemRow } from "@/modules/menu/domain/types";

interface CardapioItemsManagerProps {
  cardapioId: string;
  items: CardapioItemRow[];
  itemOptions: Array<{ id: string; name: string; type: string }>;
}

export function CardapioItemsManager({ cardapioId, items, itemOptions }: CardapioItemsManagerProps) {
  const linkedIds = new Set(items.map((item) => item.itemId));
  const availableOptions = itemOptions.filter((option) => !linkedIds.has(option.id));

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          Adicionar item ao cardápio
        </Typography>
        <Stack
          component="form"
          action={addCardapioItemAction}
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ sm: "flex-start" }}
        >
          <input type="hidden" name="cardapioId" value={cardapioId} />
          <TextField
            select
            size="small"
            label="Item"
            name="itemId"
            defaultValue=""
            sx={{ minWidth: 240 }}
            required
          >
            {availableOptions.length === 0 ? (
              <MenuItem value="" disabled>
                Nenhum item disponível
              </MenuItem>
            ) : (
              availableOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))
            )}
          </TextField>
          <TextField
            size="small"
            label="Preço de venda"
            name="salePrice"
            type="number"
            slotProps={{ htmlInput: { step: "0.01" } }}
            sx={{ width: 160 }}
            required
          />
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ pt: { sm: 0.5 } }}>
            {WEEKDAY_LABELS.map((label, index) => (
              <FormControlLabel
                key={label}
                sx={{ mr: 0.5 }}
                control={<Checkbox size="small" name="weekdays" value={index} defaultChecked />}
                label={label}
              />
            ))}
          </Stack>
          <Button type="submit" variant="contained" sx={{ backgroundColor: "#185FA5", "&:hover": { backgroundColor: "#0C447C" } }}>
            Adicionar
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Deixe todos os dias marcados para o item aparecer o cardápio inteiro; desmarque para restringir a dias específicos.
        </Typography>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell align="right">Preço de venda</TableCell>
            <TableCell>Dias da semana</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                  Nenhum item vinculado a este cardápio ainda.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.itemName}</TableCell>
                <TableCell align="right">R$ {Number(item.salePrice).toFixed(2)}</TableCell>
                <TableCell>
                  {item.weekdays === null
                    ? "Todos os dias"
                    : item.weekdays.map((day) => WEEKDAY_LABELS[day]).join(", ")}
                </TableCell>
                <TableCell align="right">
                  <form action={removeCardapioItemAction}>
                    <input type="hidden" name="cardapioId" value={cardapioId} />
                    <input type="hidden" name="cardapioItemId" value={item.id} />
                    <IconButton aria-label={`Remover ${item.itemName} do cardápio`} size="small" type="submit">
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
