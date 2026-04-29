# Checklist De Homologacao

## Ultima verificacao automatizada

Revisao executada em 2026-03-16 com sucesso para:

- `npm run build`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:python`
- `npm run test:e2e`

## Ambiente

- [ ] `npm install` conclui sem erro.
- [ ] `./scripts/reset-local-env.sh` conclui.
- [ ] `npm run dev` sobe a aplicacao em `http://127.0.0.1:3000`.
- [ ] `GET /api/health` responde `ok` ou `degraded` com motivo claro.

## Acesso

- [ ] Login com `admin@sis-restaurante.local / admin123`.
- [ ] Perfil `consulta` bloqueado em `/itens/novo` e `/fichas/nova`.
- [ ] Logout invalida a sessao.

## Engenharia De Produto

- [ ] Cadastro de item com compra, uso e conversao.
- [ ] Criacao de ficha tecnica ativa.
- [ ] Inclusao de componente intermediario.
- [ ] Inclusao de embalagem.
- [ ] Custo automatico visivel na ficha salva.
- [ ] Alteracao de preco do insumo propaga custo para ascendentes.
- [ ] Pagina `/composicao` exibe arvore expandida.
- [ ] Pagina `/custos` exibe custo direto, herdado e embalagem.
- [ ] Pesquisa em `/fichas` encontra a ficha criada.
- [ ] Inativacao da ficha reflete o novo status.

## Importacao E Auditoria

- [ ] `/importacao/pendencias` lista conflitos nao resolvidos.
- [ ] `/auditoria` mostra eventos de item, ficha e recalculo.
- [ ] O Excel legado continua tratado apenas como origem de importacao/conferencia.

## Testes

- [ ] `npm run test:unit`
- [ ] `npm run test:integration`
- [ ] `npm run test:e2e`
- [ ] `npm run test:python`
