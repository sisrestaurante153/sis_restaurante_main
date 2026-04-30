# Quick Task 260326-rv5 - Research

Data: 2026-03-26
Origem: `docs/qa/2026-03-26-plano-de-confirmacao-com-cliente.md`

## Achados principais

- O maior gap do produto atual está na ficha técnica: hoje a estrutura é linear, `Modalidade` é derivada do tipo do item e `FC/IC` ficam por componente.
- A base relacional já suporta boa parte do domínio de custo, então o caminho de menor risco é introduzir `modalidade` e `etapa` sem mexer no motor de cálculo recursivo.
- A tela de item já tem parte dos dados operacionais, mas a leitura ainda não está alinhada ao layout confirmado com o cliente.
- A importação operacional recorrente de itens continua faltando como produto próprio; não entrou nesta rodada por ser uma frente separada do núcleo de ficha.

## Direção escolhida

1. Introduzir `modalidade` e `ficha_etapa` no schema Prisma.
2. Adaptar o contrato da ficha para aceitar `stages`, preservando retrocompatibilidade com componentes planos.
3. Refatorar a UI da ficha para trabalhar por etapas e mover FC/IC para o nível da etapa.
4. Ajustar leituras-chave de item e ficha para ficar mais próximas do documento consolidado.

## Restrições observadas

- O repositório não possui `.planning/ROADMAP.md` nem `.planning/STATE.md`, então o rastreamento padrão do `gsd-quick` não pôde ser concluído.
- O ambiente local não tem `node_modules`, então a validação automática com `prisma generate`, `tsc` e Vitest ficou bloqueada nesta sessão.
