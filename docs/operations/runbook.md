# Runbook Operacional

## Subir local

1. Copie o ambiente local:

```bash
cp .env.example .env
```

2. Instale dependências:

```bash
npm install
```

3. Suba o PostgreSQL local:

```bash
npm run db:up
```

4. Aplique migrations e, se quiser a massa inicial, habilite seed:

```bash
RUN_DB_SEED=true npm run ops:migrate-and-seed
```

5. Inicie o app:

```bash
npm run dev
```

## Importar a planilha legada

1. Gere staging e relatório a partir do XLSX:

```bash
npm run import:legacy:parse -- --workbook ./fichas-tecnicas-produtos-oficial.xlsx
```

2. Carregue o staging no banco:

```bash
npm run import:legacy:load -- artifacts/imports/fichas-tecnicas-produtos-oficial/report.json
```

3. Revise a fila manual em `/importacao/pendencias`.

## Tratar pendências de reconciliação

1. Abra `/importacao/pendencias` e copie o identificador da coluna `Conflito`.
2. Escolha o item mestre de destino.
3. Aplique a reconciliação:

```bash
npm run ops:reconcile-conflict -- \
  --conflict-id <conflict-id> \
  --item-normalized-name <nome-normalizado-do-item> \
  --alias "Nome vindo do Excel"
```

4. Recalcule os custos dos itens impactados:

```bash
npm run ops:recalculate-costs -- --reason reconciliacao_manual
```

## Recalcular custos

- Recalcular todas as fichas ativas:

```bash
npm run ops:recalculate-costs
```

- Recalcular itens específicos:

```bash
npm run ops:recalculate-costs -- --item-id <item-id> --item-id <item-id>
```

## Criar usuários

```bash
npm run ops:create-user -- \
  --email operador@sis-restaurante.local \
  --name "Operador Produção" \
  --password "troque-esta-senha" \
  --role engenharia
```

Para mais de um papel, repita `--role`.

## Backup e restore

- Backup manual:

```bash
npm run ops:backup
```

- Restore manual:

```bash
npm run ops:restore -- ./artifacts/backups/sis-restaurante-AAAAMMDDTHHMMSSZ.dump
```

Antes do restore, pare `app` e `proxy` para evitar escrita concorrente.

## Fase 1 x fase 2

### Fase 1

- monólito modular completo com autenticação, cadastro, ficha, composição, custos e importação;
- reverse proxy HTTP;
- backup local em volume Docker;
- reconciliação manual por fila + script;
- documentação operacional e rollback.

### Fase 2

- TLS automatizado e hardening de borda;
- backup externo;
- workflow visual de reconciliação;
- observabilidade e automações operacionais adicionais.
