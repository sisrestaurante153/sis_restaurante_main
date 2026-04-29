import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { FormSection } from "@/components/ui/FormSection";
import {
  deleteMasterDataAction,
  saveMasterDataAction
} from "@/modules/master-data/server/master-data-actions";

interface MasterDataWorkspaceProps {
  suppliers: Array<{ id: string; name: string; active: boolean }>;
  units: Array<{ id: string; code: string; name: string; measureType: string; active: boolean }>;
  operationalCategories: Array<{ id: string; code: string; name: string; active: boolean }>;
  modalities: Array<{ id: string; code: string; name: string; active: boolean }>;
  itemTypes: Array<{ id: string; code: string; name: string; active: boolean }>;
  stageTypes: Array<{ id: string; code: string; name: string; active: boolean }>;
}

const itemTypeCodes = [
  "insumo",
  "pre_preparo",
  "intermediario",
  "produto_pronto",
  "prato",
  "porcao",
  "marmita",
  "combo",
  "embalagem",
  "apoio"
];

const stageTypeCodes = [
  { value: "limpeza_pre_preparo", label: "Limpeza / Pre-Preparo" },
  { value: "coccao_preparo", label: "Coccao / Preparo" },
  { value: "montagem", label: "Montagem" }
];

const unitTypeOptions = ["massa", "volume", "contagem"];

function DeleteButton({ kind, id }: { kind: string; id: string }) {
  return (
    <form action={deleteMasterDataAction}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" color="inherit">
        Excluir
      </Button>
    </form>
  );
}

export function MasterDataWorkspace({
  suppliers,
  units,
  operationalCategories,
  modalities,
  itemTypes,
  stageTypes
}: MasterDataWorkspaceProps) {
  return (
    <Stack spacing={3}>
      <FormSection
        title="Fornecedores"
        description="Cadastro proprio para os fornecedores usados nas referencias de compra dos itens."
      >
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <form action={saveMasterDataAction}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                  <input type="hidden" name="kind" value="supplier" />
                  <TextField fullWidth label="Novo fornecedor" name="name" />
                  <input type="hidden" name="active" value="true" />
                  <Button type="submit" variant="contained">Salvar</Button>
                </Stack>
              </form>
            </CardContent>
          </Card>
          {suppliers.map((supplier) => (
            <Card key={supplier.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between">
                  <form action={saveMasterDataAction} style={{ flex: 1 }}>
                    <Grid container spacing={2} alignItems="center">
                      <input type="hidden" name="kind" value="supplier" />
                      <input type="hidden" name="id" value={supplier.id} />
                      <Grid size={{ xs: 12, md: 8 }}>
                        <TextField fullWidth label="Fornecedor" name="name" defaultValue={supplier.name} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <FormControlLabel
                          control={<Checkbox name="active" value="true" defaultChecked={supplier.active} />}
                          label="Ativo"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <Button type="submit" variant="outlined" fullWidth>Salvar</Button>
                      </Grid>
                    </Grid>
                  </form>
                  <DeleteButton kind="supplier" id={supplier.id} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </FormSection>

      <FormSection
        title="Unidades"
        description="Unidades de compra, estoque e uso para alimentar itens, conversoes e fichas."
      >
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <form action={saveMasterDataAction}>
                <Grid container spacing={2} alignItems="center">
                  <input type="hidden" name="kind" value="unit" />
                  <input type="hidden" name="active" value="true" />
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField fullWidth label="Codigo" name="code" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label="Nome" name="name" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField fullWidth select label="Tipo" name="measureType" defaultValue="massa">
                      {unitTypeOptions.map((option) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <Button type="submit" variant="contained" fullWidth>Salvar</Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
          {units.map((unit) => (
            <Card key={unit.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between">
                  <form action={saveMasterDataAction} style={{ flex: 1 }}>
                    <Grid container spacing={2} alignItems="center">
                      <input type="hidden" name="kind" value="unit" />
                      <input type="hidden" name="id" value={unit.id} />
                      <Grid size={{ xs: 12, md: 3 }}>
                        <TextField fullWidth label="Codigo" name="code" defaultValue={unit.code} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth label="Nome" name="name" defaultValue={unit.name} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <TextField fullWidth select label="Tipo" name="measureType" defaultValue={unit.measureType}>
                          {unitTypeOptions.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 1 }}>
                        <FormControlLabel
                          control={<Checkbox name="active" value="true" defaultChecked={unit.active} />}
                          label="Ativo"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 1 }}>
                        <Button type="submit" variant="outlined" fullWidth>Salvar</Button>
                      </Grid>
                    </Grid>
                  </form>
                  <DeleteButton kind="unit" id={unit.id} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </FormSection>

      <FormSection
        title="Categorias operacionais"
        description="Lista gerenciavel usada no cabecalho e na leitura operacional dos itens."
      >
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <form action={saveMasterDataAction}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                  <input type="hidden" name="kind" value="operational-category" />
                  <input type="hidden" name="active" value="true" />
                  <TextField fullWidth label="Nova categoria operacional" name="name" />
                  <Button type="submit" variant="contained">Salvar</Button>
                </Stack>
              </form>
            </CardContent>
          </Card>
          {operationalCategories.map((category) => (
            <Card key={category.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between">
                  <form action={saveMasterDataAction} style={{ flex: 1 }}>
                    <Grid container spacing={2} alignItems="center">
                      <input type="hidden" name="kind" value="operational-category" />
                      <input type="hidden" name="id" value={category.id} />
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth label="Codigo" value={category.code} slotProps={{ input: { readOnly: true } }} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 5 }}>
                        <TextField fullWidth label="Categoria" name="name" defaultValue={category.name} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <FormControlLabel
                          control={<Checkbox name="active" value="true" defaultChecked={category.active} />}
                          label="Ativo"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 1 }}>
                        <Button type="submit" variant="outlined" fullWidth>Salvar</Button>
                      </Grid>
                    </Grid>
                  </form>
                  <DeleteButton kind="operational-category" id={category.id} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </FormSection>

      <FormSection
        title="Modalidades"
        description="Cadastro proprio para a modalidade selecionada diretamente na ficha tecnica."
      >
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <form action={saveMasterDataAction}>
                <Grid container spacing={2} alignItems="center">
                  <input type="hidden" name="kind" value="modality" />
                  <input type="hidden" name="active" value="true" />
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField fullWidth label="Codigo" name="code" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 7 }}>
                    <TextField fullWidth label="Nova modalidade" name="name" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <Button type="submit" variant="contained" fullWidth>Salvar</Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
          {modalities.map((modality) => (
            <Card key={modality.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between">
                  <form action={saveMasterDataAction} style={{ flex: 1 }}>
                    <Grid container spacing={2} alignItems="center">
                      <input type="hidden" name="kind" value="modality" />
                      <input type="hidden" name="id" value={modality.id} />
                      <Grid size={{ xs: 12, md: 3 }}>
                        <TextField fullWidth label="Codigo" name="code" defaultValue={modality.code} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 5 }}>
                        <TextField fullWidth label="Modalidade" name="name" defaultValue={modality.name} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <FormControlLabel
                          control={<Checkbox name="active" value="true" defaultChecked={modality.active} />}
                          label="Ativo"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <Button type="submit" variant="outlined" fullWidth>Salvar</Button>
                      </Grid>
                    </Grid>
                  </form>
                  <DeleteButton kind="modality" id={modality.id} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </FormSection>

      <FormSection
        title="Tipos de item"
        description="Gestao dos nomes e da disponibilidade dos tipos canonicos do dominio."
      >
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Os tipos seguem o conjunto canonico do dominio, mas a nomenclatura e a disponibilidade podem ser gerenciadas aqui.
              </Typography>
            </CardContent>
          </Card>
          {itemTypes.map((itemType) => (
            <Card key={itemType.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between">
                  <form action={saveMasterDataAction} style={{ flex: 1 }}>
                    <Grid container spacing={2} alignItems="center">
                      <input type="hidden" name="kind" value="item-type" />
                      <input type="hidden" name="id" value={itemType.id} />
                      <Grid size={{ xs: 12, md: 3 }}>
                        <TextField fullWidth select label="Codigo" name="code" defaultValue={itemType.code}>
                          {itemTypeCodes.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 5 }}>
                        <TextField fullWidth label="Nome exibido" name="name" defaultValue={itemType.name} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <FormControlLabel
                          control={<Checkbox name="active" value="true" defaultChecked={itemType.active} />}
                          label="Ativo"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <Button type="submit" variant="outlined" fullWidth>Salvar</Button>
                      </Grid>
                    </Grid>
                  </form>
                  <DeleteButton kind="item-type" id={itemType.id} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </FormSection>

      <FormSection
        title="Tipos de etapa"
        description="Cadastro mestre dos tipos que governam FC, IC e o fluxo de montagem da ficha."
      >
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Limpeza / Pre-Preparo calcula FC, Coccao / Preparo calcula IC e Montagem nao calcula nenhum dos dois.
              </Typography>
            </CardContent>
          </Card>
          {stageTypes.map((stageType) => (
            <Card key={stageType.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between">
                  <form action={saveMasterDataAction} style={{ flex: 1 }}>
                    <Grid container spacing={2} alignItems="center">
                      <input type="hidden" name="kind" value="stage-type" />
                      <input type="hidden" name="id" value={stageType.id} />
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth select label="Codigo" name="code" defaultValue={stageType.code}>
                          {stageTypeCodes.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth label="Tipo de etapa" name="name" defaultValue={stageType.name} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <FormControlLabel
                          control={<Checkbox name="active" value="true" defaultChecked={stageType.active} />}
                          label="Ativo"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <Button type="submit" variant="outlined" fullWidth>Salvar</Button>
                      </Grid>
                    </Grid>
                  </form>
                  <DeleteButton kind="stage-type" id={stageType.id} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </FormSection>
    </Stack>
  );
}
