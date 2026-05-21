-- Desativa unidades com sufixos internos gerados por testes ou importações malformadas.
-- Padrão: códigos contendo -int, -forn, -eng, -presenter seguidos de hífen ou fim de string.
UPDATE unidade_medida
SET sn_ativo = false
WHERE ds_codigo ~ '-(int|forn|eng|presenter)(-|$)';

-- Normaliza typos comuns para o código canônico.
UPDATE unidade_medida SET ds_codigo = 'kg',   nm_unidade = 'Quilograma' WHERE ds_codigo IN ('kgg', 'kgs', 'quilos', 'quilograma');
UPDATE unidade_medida SET ds_codigo = 'g',    nm_unidade = 'Grama'      WHERE ds_codigo IN ('grama', 'gramas') AND ds_codigo NOT IN ('g');
UPDATE unidade_medida SET ds_codigo = 'maco', nm_unidade = 'Maco'       WHERE ds_codigo IN ('mç', 'maço') AND ds_codigo NOT IN ('maco');
UPDATE unidade_medida SET ds_codigo = 'un',   nm_unidade = 'Unidade'    WHERE ds_codigo IN ('unidade', 'unidades') AND ds_codigo NOT IN ('un');
UPDATE unidade_medida SET ds_codigo = 'pç',   nm_unidade = 'Peca'       WHERE ds_codigo IN ('peça', 'pecas') AND ds_codigo NOT IN ('pç');
