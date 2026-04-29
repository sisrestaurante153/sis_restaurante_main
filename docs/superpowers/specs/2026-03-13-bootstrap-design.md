# Bootstrap Design

## Contexto

O repositório começa sem código-fonte, sem controle de versão e com apenas o Excel legado e notas de análise. O objetivo desta primeira entrega é criar a fundação técnica do sistema como um monólito modular web, sem reproduzir o Excel como arquitetura do produto.

## Decisões

### Estrutura da aplicação

- Workspace único na raiz, compatível com `npm` e `pnpm`.
- Aplicação Next.js 15 com App Router e React 19 rodando como deploy único.
- Código organizado em módulos internos com fronteiras explícitas por responsabilidade:
  - `ui`
  - `server`
  - `domain`
  - `infra`

### Banco e domínio

- PostgreSQL como banco relacional principal.
- Prisma ORM como camada base de persistência.
- Schema inicial já inclui os agregados mandatórios do domínio para evitar retrabalho estrutural no bootstrap.
- Recursão profunda e bloqueio de ciclos ficam previstos na modelagem e na ADR, mas não totalmente implementados nesta etapa.

### Bootstrap funcional

- Página inicial mínima apenas para comprovar o boot.
- `GET /api/health` como healthcheck HTTP.
- Logger server-side simples para eventos operacionais.
- Configuração de ambiente centralizada com validação.
- Dockerfile multi-stage e `docker-compose.yml` preparados para app + PostgreSQL.

### Qualidade

- Vitest para testes unitários e de contrato leve.
- Playwright configurado para smoke e2e.
- README com fluxo de bootstrap e execução local.
- ADR 001 justificando o monólito modular.

## Abordagem escolhida

Foi escolhida uma única aplicação Next.js na raiz do repositório em vez de múltiplos pacotes executáveis. Isso mantém o deploy simples, reduz atrito operacional e permite modularidade real por domínio, não por processo. O workspace permanece pronto para crescer com scripts, importadores Python e pacotes auxiliares sem fragmentar o produto.

## Critérios de sucesso deste bootstrap

- Projeto instala dependências e sobe localmente com `npm run dev`.
- Estrutura deixa claro onde entram UI, server, domain, infra e tests.
- Prisma schema, env e Compose ficam prontos para o próximo ciclo.
- Existe um healthcheck verificável por teste automatizado.
- O repositório contém documentação suficiente para onboarding técnico inicial.
