# Deferred Items — Quick 20260421 fix-cliente-tela-item-3-bugs

Out-of-scope test failures observed durante a execucao deste quick task
(pre-existentes na base 5f942ddcb7f8f7553ac6ab8c8049d95071055a41, confirmados
via `git stash` isolado antes/depois das mudancas).

## Pre-existing failing unit tests (nao causados por T1/T2/T3)

- `src/tests/unit/engineering/fichas-listing.test.tsx` — 14 FAILs: erros
  `getByTestId("column-headers")` nao encontra o nó; divergencia de DOM
  estrutural entre o teste e o componente fichas-listing atual.

- `src/tests/unit/items-listing.test.tsx` — 8 FAILs: testes esperam 15 column
  headers + `data-field` attrs e larguras pixel-perfect (name=162px,
  description=40px) que o componente atual nao expõe.

- `src/tests/unit/item-detail-page.test.tsx` — 1 FAIL: divergencia entre
  snapshot e o form atual pos-Phase 9.

- `src/tests/unit/catalog-repository.test.ts` — 1 FAIL: relacionado a
  fixture/expectation desalinhada da estrutura purchases atual.

Todos reproduzidos com `git stash` (working tree vazia em relacao a base).
Owner: proximo quick task de manutencao de testes (nao-critico — nao bloqueia
producao, nao cobre regressao introduzida por este task).
