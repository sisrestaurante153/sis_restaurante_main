# Remocao Do Cabecalho Da Sidebar

## Contexto

O layout autenticado exibe um bloco superior expandido na sidebar com ponto de status, nome do sistema, titulo "Painel operacional" e texto descritivo. A solicitacao aprovada foi remover esse bloco para que a navegacao comece mais cedo no eixo vertical.

## Decisao

Remover o bloco superior expandido da sidebar em [`src/components/layout/AppShellClient.tsx`](/home/felipe/Desktop/projetos/sis-restaurante/src/components/layout/AppShellClient.tsx), preservando:

- o controle de recolher/expandir a sidebar
- a navegacao existente
- o comportamento do modo compacto
- o card do usuario no rodape

## Resultado Esperado

- No modo expandido, a area superior da sidebar mostra apenas o controle de recolher/expandir.
- Os textos "SIS Restaurante", "Painel operacional" e a descricao operacional deixam de ser renderizados.
- A navegacao continua funcional e sem alteracao estrutural.

## Validacao

- Cobrir com teste unitario a ausencia do cabecalho expandido.
- Rodar o teste especifico da sidebar shell apos a alteracao.
