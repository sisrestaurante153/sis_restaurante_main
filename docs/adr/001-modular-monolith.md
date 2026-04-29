# ADR 001: Monólito Modular

- Status: Aceito
- Data: 2026-03-13

## Contexto

O produto precisa centralizar cadastro mestre de itens, fichas técnicas recursivas, cálculo de custo/rendimento, rastreabilidade, auditoria, autenticação e importação de Excel legado. O domínio é fortemente relacional, exige consistência transacional e deve ser implantado em infraestrutura própria com baixo custo operacional.

## Decisão

Adotar um monólito modular com Next.js 15 no App Router, PostgreSQL e Prisma ORM, mantendo um único deploy executável e separando responsabilidades por módulos internos (`ui`, `server`, `domain`, `infra`).

## Justificativa

1. O problema é rico em regra de negócio, não em fronteiras independentes de runtime.
2. Recálculo em cascata, versionamento de fichas e auditoria pedem transações e observabilidade concentradas.
3. Separar frontend e backend em processos distintos aumentaria latência organizacional e operacional sem ganho proporcional.
4. PostgreSQL resolve melhor hierarquia, integridade referencial, histórico e consultas analíticas do que alternativas NoSQL para este cenário.
5. O Excel deve ser tratado como entrada de migração, não como arquitetura do sistema; por isso a modelagem canônica precisa viver no backend.

## Consequências

### Positivas

- Deploy mais simples para ambiente self-hosted.
- Base de código única com menor custo de coordenação.
- Evolução incremental do domínio sem contratos distribuídos prematuros.
- Testes end-to-end e observabilidade mais diretos.

### Negativas

- Disciplina de modularidade passa a ser obrigação do código, não da infraestrutura.
- Escala horizontal futura exige atenção a sessões, fila de recálculo e cache.
- Importação legada e motor recursivo convivem no mesmo repositório, exigindo fronteiras internas bem definidas.

## Guardrails

- Não criar serviços separados para CRUD, cálculo ou importação nesta fase.
- Não duplicar entidades por módulo; `item` permanece entidade mestre única.
- Não modelar profundidade máxima para composição.
- Toda evolução deve preservar a separação entre `ui`, `server`, `domain` e `infra`.
