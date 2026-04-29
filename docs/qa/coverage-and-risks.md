# Cobertura E Riscos

Data da verificacao: 2026-03-16

## Cobertura Atual

- `npm run build`: passou.
- `npm run test:unit`: 23 arquivos, 68 testes passando.
- `npm run test:integration`: 3 testes Prisma passando.
- `npm run test:python`: 4 testes do parser legado passando.
- `npm run test:e2e`: 7 cenarios Playwright passando.

## O Que Esta Coberto

- autenticacao, sessao e autorizacao por rota;
- cadastro de itens com compra, fornecedor, conversao e custo;
- validacao de formularios de item e ficha;
- composicao recursiva, custo, rendimento e cascata;
- auditoria e repositorios com preferencia por Prisma;
- importacao com conflitos persistidos e reconciliacao manual;
- navegacao principal, bloqueio de escrita para perfil consulta e fluxo completo de engenharia no navegador.

## Riscos Abertos

- O fallback em arquivo local continua existente como contingencia quando o PostgreSQL nao esta acessivel; o caminho principal homologado nesta revisao foi o banco real.
- A configuracao do Vitest ainda usa `environmentMatchGlobs`, que ja emite aviso de deprecacao.
- Durante os testes E2E em `next dev`, foi observado um warning deprecado do cliente `pg`; a funcionalidade nao falhou, mas vale saneamento antes de endurecer CI de longo prazo.

## Recomendacoes Imediatas

- Migrar o Vitest para `test.projects`.
- Investigar a origem exata do warning de `client.query()` antes de formalizar pipeline CI/CD mais restritivo.
- Manter a homologacao periodica com `npm run build`, `npm run test:integration` e `npm run test:e2e` sempre que houver alteracoes no motor de custo, fichas ou importacao.
