"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import ListSubheader from "@mui/material/ListSubheader";
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
import { FormSection } from "@/components/ui/FormSection";
import { addCardapioItemAction, removeCardapioItemAction } from "@/modules/menu/server/menu-actions";
import { WEEKDAY_LABELS, type CardapioItemRow } from "@/modules/menu/domain/types";

interface CardapioItemsManagerProps {
  cardapioId: string;
  items: CardapioItemRow[];
  itemOptions: Array<{ id: string; name: string; type: string }>;
}

const TYPE_LABEL: Record<string, string> = {
  prato: "Prato",
  porcao: "Porção",
  marmita: "Marmita",
  combo: "Combo",
  produto_pronto: "Produto pronto"
};

const BORDER = "#D3D1C7";
const BG = "#F4F4F2";
const AZUL = "#185FA5";

function groupByType(options: Array<{ id: string; name: string; type: string }>) {
  const groups = new Map<string, typeof options>();
  for (const option of options) {
    const list = groups.get(option.type) ?? [];
    list.push(option);
    groups.set(option.type, list);
  }
  return [...groups.entries()].sort((a, b) => (TYPE_LABEL[a[0]] ?? a[0]).localeCompare(TYPE_LABEL[b[0]] ?? b[0]));
}

function WeekdayCheckbox({ label, index, defaultChecked }: { label: string; index: number; defaultChecked: boolean }) {
  const box = (checked: boolean) => (
    <Box
      sx={{
        width: 30,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 600,
        borderRadius: "5px",
        border: `1px solid ${checked ? AZUL : BORDER}`,
        bgcolor: checked ? "#E6F1FB" : "#fff",
        color: checked ? AZUL : "#5F5E5A"
      }}
    >
      {label}
    </Box>
  );
  return (
    <Checkbox
      name="weekdays"
      value={index}
      defaultChecked={defaultChecked}
      disableRipple
      icon={box(false)}
      checkedIcon={box(true)}
      sx={{ p: 0.4 }}
    />
  );
}

function WeekdayBadges({ weekdays }: { weekdays: number[] | null }) {
  if (weekdays === null) {
    return (
      <Box
        component="span"
        sx={{ fontSize: 10.5, padding: "2px 8px", borderRadius: "4px", bgcolor: "#EAF3DE", color: "#1B6B2C", fontWeight: 500 }}
      >
        Todos os dias
      </Box>
    );
  }
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap">
      {weekdays.map((day) => (
        <Box
          key={day}
          component="span"
          sx={{ fontSize: 10.5, padding: "2px 7px", borderRadius: "4px", bgcolor: "#F1EFE8", color: "#444441", fontWeight: 500 }}
        >
          {WEEKDAY_LABELS[day]}
        </Box>
      ))}
    </Stack>
  );
}

export function CardapioItemsManager({ cardapioId, items, itemOptions }: CardapioItemsManagerProps) {
  const linkedIds = new Set(items.map((item) => item.itemId));
  const availableOptions = itemOptions.filter((option) => !linkedIds.has(option.id));
  const grouped = groupByType(availableOptions);

  return (
    <FormSection
      title="Itens do cardápio"
      description="Adicione itens vendáveis com preço e os dias da semana em que aparecem."
    >
      <Stack spacing={2.5}>
        <Box
          component="form"
          action={addCardapioItemAction}
          sx={{
            p: 2,
            border: `0.5px solid ${BORDER}`,
            borderRadius: 2,
            bgcolor: "#FAFAF8"
          }}
        >
          <input type="hidden" name="cardapioId" value={cardapioId} />
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "flex-end" }}>
            <TextField
              select
              size="small"
              label="Item"
              name="itemId"
              defaultValue=""
              sx={{ minWidth: 260, flex: 1 }}
              required
            >
              {grouped.length === 0 ? (
                <MenuItem value="" disabled>
                  Nenhum item disponível
                </MenuItem>
              ) : (
                grouped.flatMap(([type, options]) => [
                  <ListSubheader key={`header-${type}`} sx={{ fontSize: 11, lineHeight: "28px" }}>
                    {TYPE_LABEL[type] ?? type}
                  </ListSubheader>,
                  ...options.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name}
                    </MenuItem>
                  ))
                ])
              )}
            </TextField>
            <TextField
              size="small"
              label="Preço de venda"
              name="salePrice"
              type="number"
              slotProps={{ htmlInput: { step: "0.01" } }}
              sx={{ width: { xs: "100%", md: 150 } }}
              required
            />
            <Box>
              <Typography sx={{ fontSize: 10.5, color: "#888780", mb: 0.5 }}>Dias da semana</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {WEEKDAY_LABELS.map((label, index) => (
                  <WeekdayCheckbox key={label} label={label} index={index} defaultChecked />
                ))}
              </Stack>
            </Box>
            <Button
              type="submit"
              variant="contained"
              sx={{ backgroundColor: AZUL, "&:hover": { backgroundColor: "#0C447C" }, height: 40 }}
            >
              Adicionar
            </Button>
          </Stack>
          <Typography sx={{ fontSize: 11, color: "#888780", mt: 1.5 }}>
            Deixe todos os dias marcados para o item aparecer o cardápio inteiro; desmarque para restringir a dias específicos.
          </Typography>
        </Box>

        <Box sx={{ overflowX: "auto", border: `0.5px solid ${BORDER}`, borderRadius: 2 }}>
          <Table size="small" sx={{ minWidth: 620 }}>
            <TableHead>
              <TableRow sx={{ "& th": { bgcolor: BG, fontSize: 11.5, fontWeight: 600, color: "#5F5E5A", borderBottom: `0.5px solid ${BORDER}` } }}>
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
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                      Nenhum item vinculado a este cardápio ainda.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} hover sx={{ "& td": { fontSize: 13, borderBottom: "0.5px solid #EDEBE3", py: 1 } }}>
                    <TableCell sx={{ px: 2 }}>{item.itemName}</TableCell>
                    <TableCell align="right" sx={{ px: 2, whiteSpace: "nowrap" }}>
                      R$ {Number(item.salePrice).toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ px: 2 }}>
                      <WeekdayBadges weekdays={item.weekdays} />
                    </TableCell>
                    <TableCell align="right" sx={{ px: 1 }}>
                      <form action={removeCardapioItemAction}>
                        <input type="hidden" name="cardapioId" value={cardapioId} />
                        <input type="hidden" name="cardapioItemId" value={item.id} />
                        <IconButton aria-label={`Remover ${item.itemName} do cardápio`} size="small" type="submit">
                          <DeleteOutlineIcon fontSize="small" sx={{ color: "#A32D2D" }} />
                        </IconButton>
                      </form>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Stack>
    </FormSection>
  );
}
