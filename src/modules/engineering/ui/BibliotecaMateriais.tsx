"use client";

import { useDeferredValue, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ComponentOption } from "@/modules/engineering/ui/components-editor.types";

interface BibliotecaMateriaisProps {
  itemOptions: ComponentOption[];
  onAddItem: (item: ComponentOption) => void;
}

function formatCurrency(value: string | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value ?? "0"));
}

export function BibliotecaMateriais({ itemOptions, onAddItem }: BibliotecaMateriaisProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [group, setGroup] = useState("all");
  const deferredQuery = useDeferredValue(query);

  const groups = useMemo(
    () =>
      Array.from(
        new Set(itemOptions.map((item) => item.operationalCategory?.trim() || "Sem grupo"))
      ).sort((left, right) => left.localeCompare(right)),
    [itemOptions]
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return itemOptions.filter((item) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [item.name, item.type, item.operationalCategory ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesType = type === "all" || item.type === type;
      const matchesGroup = group === "all" || (item.operationalCategory?.trim() || "Sem grupo") === group;

      return matchesQuery && matchesType && matchesGroup;
    });
  }, [deferredQuery, group, itemOptions, type]);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          fullWidth
          label="Buscar material"
          placeholder="Buscar material..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }
          }}
        />

        <TextField
          select
          label="Tipo"
          value={type}
          onChange={(event) => setType(event.target.value)}
          sx={{ minWidth: { sm: 180 } }}
        >
          <MenuItem value="all">Todos os tipos</MenuItem>
          {Array.from(new Set(itemOptions.map((item) => item.type))).map((option) => (
            <MenuItem key={option} value={option}>
              {option.replaceAll("_", " ")}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Grupo"
          value={group}
          onChange={(event) => setGroup(event.target.value)}
          sx={{ minWidth: { sm: 180 } }}
        >
          <MenuItem value="all">Todos os grupos</MenuItem>
          {groups.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {filteredItems.length > 0 ? (
        <Grid container spacing={2}>
          {filteredItems.map((item) => (
            <Grid key={item.id} size={{ xs: 6, sm: 4, md: 3 }}>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={1.5}>
                    <Typography fontWeight={600}>{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.type.replaceAll("_", " ")}
                    </Typography>
                    <Typography variant="body2" color="custom.custo" fontWeight={600}>
                      {formatCurrency(item.currentCost)} / {item.usageUnit}
                    </Typography>
                    <Box>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => onAddItem(item)}
                      >
                        Adicionar
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box
          sx={{
            px: 3,
            py: 6,
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
            textAlign: "center"
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Nenhum material encontrado para os filtros atuais.
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
