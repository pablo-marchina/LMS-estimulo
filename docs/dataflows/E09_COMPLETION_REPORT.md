# Relatório de conclusão do E09

**Etapa:** E09 — Fluxos de dados ponta a ponta  
**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** Concluída no nível lógico; implementação física depende de E10–E13

## 1. Escopo concluído

- quatro padrões de fluxo: transação interna, observação do cliente, webhook de entrada e efeito externo;
- stores lógicos, estados intermediários e fronteiras de responsabilidade;
- fluxos completos para identidade, governança, publicação, jornadas, diagnóstico, conteúdo, avaliação, prática, gamificação, credenciais, intervenções, HubSpot, crédito e features/score;
- matriz de roteamento para os 118 eventos do catálogo E08;
- linhagem entre origem, store, evento, transformação e destino;
- política de retry, dead letter, replay, compensação e reconciliação;
- separação entre consistência interna forte e integrações eventualmente consistentes;
- requisitos de observabilidade e correlação.

## 2. Decisões resultantes

1. O evento canônico e o estado operacional correspondente fazem parte da mesma unidade atômica lógica.
2. O response do comando não depende de HubSpot, notificações ou consumidores assíncronos.
3. Webhooks externos são recebidos, verificados e normalizados antes de qualquer comando de domínio.
4. Replay não executa efeitos externos por padrão.
5. HubSpot recebe projeções aprovadas, não o event log.
6. Features e score experimental são consumidores derivados e não alteram fatos de origem.
7. Fluxos funcionam para qualquer jornada e são testados com uma segunda jornada sintética antes da produção.

## 3. Pendências explicitamente não resolvidas

- tecnologia física dos stores, fila e workers;
- modelo lógico/físico de tabelas e índices;
- objetos/propriedades HubSpot;
- fonte e estados oficiais de crédito;
- prazos exatos de retenção;
- SLOs e limiares finais de alerta.

Essas pendências não invalidam os fluxos lógicos; são entradas das etapas E10, E11, E12 e E13.

## 4. Critérios de aceite atendidos

- cada evento do catálogo possui rota máquina-legível;
- cada família possui origem, validação, persistência, consumidores, falhas e recuperação;
- nenhum fluxo depende do slug OpenAI;
- fatos críticos só são emitidos pelo servidor ou conector verificado;
- efeitos duplicáveis possuem requisito de idempotência;
- arquivos e PII não atravessam eventos indevidamente;
- integrações são desacopladas e reconciliáveis;
- replay seguro está separado de reenvio externo.

## 5. Próxima etapa

E10 — modelagem completa do banco: entidades operacionais, event store, outbox/inbox, projeções, integrações, features, score, constraints, índices, RLS, migrations e estratégia de retenção.
