# Premissas e escopo

**Versão:** 0.4  
**Data:** 2026-07-10  
**Status:** Baseline revalidada para o E14

## Hierarquia de referência

1. `Estimulo_all` e decisões explícitas posteriores da Estímulo;
2. ADRs atuais;
3. estado real do repositório e ambientes autorizados;
4. demais documentos;
5. código e artefatos legados.

## Problema central

A Estímulo precisa transformar capacitação em uma camada integrada à jornada do empreendedor. Interações relevantes devem preservar contexto, sequência e temporalidade para personalização, relacionamento e pesquisa futura.

## Resultado esperado

A plataforma deverá:

- operar jornadas e conteúdos próprios ou externos;
- configurar formulários versionados;
- iniciar com quatro arquétipos, sem limite estrutural fixo;
- permitir adicionar, retirar, dividir, fundir e versionar arquétipos;
- versionar políticas de classificação e regras de utilização;
- preservar submissões, atribuições, recálculos e overrides;
- armazenar no HubSpot todos os dados de negócio coletados;
- usar em funções de negócio somente dados provenientes do HubSpot;
- registrar ações relevantes com finalidade, retenção e contrato.

## Ambientes

- Supabase: local, desenvolvimento e teste;
- AWS: staging e produção;
- HubSpot: autoridade dos dados de negócio em todos os ambientes;
- PostgreSQL: plano técnico de outbox, idempotência, cache HubSpot-sourced, auditoria e reconciliação;
- nenhuma promoção direta do Supabase para produção.

## HubSpot e dados do produto

- Todo dado de negócio coletado deverá ser persistido no HubSpot.
- Todo dado usado para classificação, personalização, recomendação, segmentação ou automação deverá ser lido do HubSpot ou de réplica com origem HubSpot comprovada.
- Respostas recém-recebidas não poderão alimentar classificação antes da escrita e do readback no HubSpot.
- Formulários, perguntas, opções, arquétipos, políticas e regras de ativação serão persistidos e versionados no HubSpot.
- O estado `submitted` exige confirmação de escrita e readback.
- Durante indisponibilidade, o dado poderá permanecer `pending_hubspot`, mas não poderá ser utilizado.
- Caches locais exigem objeto de origem, versão, hash, horário de leitura, TTL e invalidação.
- PostgreSQL não poderá ser uma autoridade paralela dos dados de usuário.

## Formulário e arquétipos

- Formulários seguem definição–versão–instância.
- Rascunhos são editáveis; versões publicadas são imutáveis.
- A configuração inicial pode ter quatro arquétipos, mas a quantidade ativa é editável.
- Adicionar ou retirar arquétipos cria nova versão da política de classificação.
- Arquétipos já atribuídos não são apagados do histórico.
- Resultados anteriores não são sobrescritos.
- Recálculo e override são explícitos, autorizados e auditáveis.
- Onde e quando o resultado será usado é definido por regras versionadas, não por condicionais hardcoded.

## Conteúdo externo

Cada conteúdo deverá declarar provedor, identificador, URL, direitos, disponibilidade, tracking, regra de conclusão, fallback e versão.

## Fora do escopo inicial

- decisão automática de crédito;
- score produtivo de aprovação ou rejeição;
- múltiplos provedores sem necessidade;
- microserviços sem justificativa;
- produção no Supabase;
- envio de logs técnicos, segredos ou binários ao HubSpot sem finalidade.

## Princípios

1. Decisões explícitas atuais prevalecem sobre artefatos antigos.
2. Toda regra e configuração relevante possui versão.
3. Arquétipos são configuráveis e sem limite hardcoded.
4. Todo dado de negócio coletado é armazenado no HubSpot.
5. Todo dado usado pelo produto possui origem HubSpot comprovável.
6. PostgreSQL não é autoridade paralela dos dados de usuário.
7. Toda ação relevante possui finalidade, retenção e teste.
8. Supabase é somente teste e AWS staging é gate de produção.
9. Código, integrações, testes e documentação mudam juntos.
