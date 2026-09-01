# Princípios da release inicial de produção

**Versão:** 2.0  
**Revisado em:** 2026-09-01  
**Status:** especificação vigente; produção institucional continua condicionada ao Gate B AWS

## Definição

A primeira release deve entregar a plataforma LMS da Estímulo com Jornada OpenAI, autenticação real, administração, diagnóstico, aprendizagem, engajamento e governança. Supabase/Vercel podem demonstrar e validar o software; produção institucional depende da arquitetura AWS aprovada.

## Capacidades mínimas

- cadastro, confirmação, login, recuperação e termos;
- entrada administrativa separada por Google + identidade interna + membership Estímulo + RBAC;
- diagnóstico principal configurável e quatro arquétipos;
- Jornada OpenAI com trilhas, aulas, quick checks, práticas e avaliações;
- home, jornadas, biblioteca, perfil, ajuda e engajamento;
- pontos, ranking com identificação mascarada, recompensas, badges e certificados;
- administração de produto, diagnóstico, usuários, conteúdo e credenciais;
- eventos estruturados e outbox;
- responsividade, acessibilidade, segurança e privacidade;
- replay/reprodutibilidade e observabilidade compatível com o gate do ambiente.

## Diagnóstico

Os arquétipos podem personalizar a experiência apenas a partir de configuração/metodologia aprovada. A implementação não inventa cutoff ausente. O runtime deve calcular a configuração publicada de forma determinística e auditável; uso em crédito permanece proibido.

## Jornada OpenAI

A publicação depende de materiais editoriais aprovados, critérios de conclusão, avaliações, regras de gamificação, acessibilidade e revisão aplicável. O lifecycle é uma jornada operacional única `draft ↔ published`, com edição ao vivo de publicada.

## Integrações externas

PostgreSQL é a fonte operacional. Nenhum CRM é precondição síncrona do produto. Eventos/outbox preparam exportação futura e `ETL_EXPORT_ENABLED=false` é o padrão. Se HubSpot for habilitado, `DEC-070` restringe as categorias exportáveis e exige consumidor, retry, deduplicação e reconciliação.

Portanto, **integração HubSpot direta não é Gate A do software**. O ambiente que decidir habilitar um consumidor externo precisa provar o destino correspondente no Gate B/escopo operacional aprovado.

## Proibições

- dados fictícios apresentados como reais;
- diagnóstico sintético apresentado como metodologia oficial;
- autenticação apenas visual ou bypass de teste em runtime;
- segredos em código/docs/logs;
- alteração manual de schema fora de migration;
- ranking expondo e-mail completo de outro participante;
- popup de badge tratando histórico como nova conquista;
- evento duplicável sem idempotência;
- sinal educacional influenciando crédito sem governança;
- dependência síncrona de integração externa para confirmar escrita de domínio;
- Supabase/Vercel tratados como produção institucional.

## Gate

Gate A comprova o software por SHA. Gate B comprova o ambiente AWS definitivo, incluindo E2E, identidade, capacidade, isolamento, continuidade, segurança, privacidade, conteúdo e acessibilidade. Consulte [`../operations/FINAL_RELEASE_RUNBOOK.md`](../operations/FINAL_RELEASE_RUNBOOK.md).