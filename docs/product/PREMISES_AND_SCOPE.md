# Premissas e escopo

**Versão:** 0.5  
**Data:** 2026-07-14  
**Status:** baseline alinhada às referências oficiais

## Hierarquia de referência

1. documentos oficiais de referência fornecidos pela Estímulo;
2. alterações posteriores explicitamente aprovadas pela Estímulo;
3. decisões de produto e arquitetura que apenas interpretam as referências;
4. estado real do repositório e dos ambientes autorizados;
5. documentação técnica, código e histórico legado.

Um ADR não pode modificar silenciosamente um requisito oficial. Quando houver alteração de produto, ela deve identificar a referência afetada e a aprovação correspondente.

## Problema central

A Estímulo precisa transformar capacitação em uma camada integrada à jornada do empreendedor. As interações relevantes devem preservar contexto, sequência e temporalidade para personalização, relacionamento e pesquisa futura.

## Resultado esperado

A plataforma deverá:

- operar jornadas e conteúdos próprios ou externos;
- publicar inicialmente a Jornada OpenAI;
- configurar e versionar formulários, avaliações e regras;
- operar inicialmente os quatro arquétipos oficiais;
- personalizar jornadas conforme diagnóstico e contexto autorizado;
- registrar interações relevantes, progresso, avaliações e pontos;
- oferecer comentários, uploads, provas, selos e certificados;
- manter o HubSpot como visão integrada do empreendedor;
- suportar múltiplas jornadas sem mudança estrutural;
- operar em AWS nos ambientes de staging e produção.

## Ambientes e responsabilidades

- **Supabase:** desenvolvimento e teste;
- **AWS:** staging e produção;
- **PostgreSQL:** banco operacional do LMS, eventos, outbox, idempotência e auditoria técnica;
- **HubSpot:** User 360, relacionamento e projeções de dados de negócio relevantes;
- **storage autorizado:** arquivos, materiais, uploads e certificados.

Não haverá promoção direta do Supabase para produção.

## HubSpot e dados do produto

- Identidade, informações do negócio, contexto de crédito autorizado, diagnóstico vigente, progresso agregado, conclusão e sinais aprovados deverão estar disponíveis no HubSpot.
- Eventos granulares e telemetria permanecem no event store, com projeção seletiva para o HubSpot.
- A sincronização padrão usa outbox, retry idempotente e reconciliação.
- Readback é obrigatório somente para escritas CRM críticas que precisem de confirmação antes de uso imediato.
- O LMS não depende de round-trip síncrono ao HubSpot para cada resposta, avaliação ou registro de progresso.
- Formulários, jornadas, conteúdos, provas e políticas editoriais são versionados na plataforma; o HubSpot recebe versões, resultados e referências relevantes.
- Nenhum log técnico, segredo ou binário será enviado ao HubSpot sem finalidade explícita.

## Formulário e arquétipos

- Formulários seguem definição–versão–instância.
- Rascunhos são editáveis; versões publicadas são imutáveis.
- A operação inicial usa os quatro arquétipos oficiais.
- A arquitetura pode aceitar alterações futuras, mas isso não substitui a obrigação de publicar os quatro perfis definidos pela referência.
- Arquétipos já atribuídos não são apagados do histórico.
- Recálculo e override são explícitos, autorizados e auditáveis.
- Confiança ou probabilidade somente será exibida quando sustentada pela metodologia aprovada.

## Jornada OpenAI

A primeira jornada publicada deve conter:

- boas-vindas e bloco base opcional;
- trilhas de Marketing e Vendas e de Gestão;
- bloco avançado com Codex conforme regra aprovada;
- vídeos, materiais, prompts, templates e práticas;
- quick checks, provas, tentativas e critérios de conclusão;
- pontos, selos e certificados;
- comentários e uploads previstos nas aulas.

## Conteúdo externo

Conteúdo de parceiros deve declarar, no mínimo:

- provedor;
- URL ou identificador;
- autorização de uso;
- forma de exibição ou redirecionamento;
- regra de conclusão;
- tracking mínimo;
- fallback quando indisponível.

## Crédito

O momento da jornada de crédito pode ser usado para personalizar capacitação e relacionamento.

Ficam fora do escopo da primeira entrega:

- decisão automática de crédito;
- score produtivo de aprovação ou rejeição;
- alteração automática de taxa, limite ou garantia;
- uso de arquétipo ou interação educacional sem validação e governança específicas.

## Fora do escopo necessário

- microserviços sem justificativa;
- múltiplos provedores sem necessidade;
- aplicativo móvel nativo;
- segunda jornada antes da conclusão da OpenAI;
- marketplace complexo de recompensas;
- substituição integral de legado já contido;
- refatorações cosméticas sem impacto na entrega;
- produção no Supabase.

## Princípios

1. Referências oficiais prevalecem sobre ADRs, código e mockups.
2. A Jornada OpenAI e os quatro arquétipos oficiais são as entradas prioritárias.
3. Regras e versões publicadas preservam histórico.
4. O HubSpot concentra a visão operacional; o LMS preserva o detalhe transacional e comportamental.
5. Toda ação relevante possui evento, finalidade e teste proporcionais ao risco.
6. Dívida técnica contida não bloqueia a entrega sem risco ou dependência concreta.
7. Supabase é somente desenvolvimento/teste e AWS staging é gate de produção.
8. Código, integrações, testes e documentação da mesma capacidade mudam juntos.