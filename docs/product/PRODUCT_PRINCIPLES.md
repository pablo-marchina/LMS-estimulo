# Princípios de produto da Plataforma Estímulo

## Propósito

A Plataforma Estímulo oferece jornadas de desenvolvimento empreendedor configuráveis, acompanhamento de aprendizagem, ferramentas administrativas e evidências auditáveis para operação e pesquisa.

## Princípios

1. **Multi-jornada por configuração.** O núcleo não depende de uma jornada, UUID, slug, parceiro ou conteúdo específico.
2. **Participante e administração compartilham o mesmo domínio.** Administração usa casos de uso autorizados, não um backend paralelo.
3. **Cada jornada é uma entidade única.** O lifecycle visível é `draft ↔ published`; fatos históricos são preservados pelos stores que os produziram.
4. **Aprendizagem não é inferida de exposição.** Conteúdo consumido, quick check, avaliação, prática, feedback e conclusão são fatos distintos.
5. **Diagnóstico é configurável e auditável.** Metodologia, pesos e cortes não são inventados pelo runtime.
6. **Sinais educacionais não decidem crédito por padrão.** Qualquer uso futuro exige governança própria.
7. **Gamificação deriva de fatos.** Pontos usam ledger idempotente; badges, recompensas e certificados têm critérios explícitos.
8. **Privacidade por desenho.** A plataforma coleta o necessário, minimiza PII em eventos e protege identidade e arquivos.
9. **Integrações são de borda.** Estado de negócio é confirmado sem depender de um sistema externo síncrono.
10. **Estados vazios e erros são honestos.** Dado fictício não é apresentado como estado real.
11. **Acessibilidade e responsividade são requisitos de produto.** Fluxos centrais devem funcionar em dispositivos e tecnologias assistivas suportados.
12. **Operação faz parte da funcionalidade.** Reprodutibilidade, observabilidade, segurança, rollback e documentação participam do aceite.

## Capacidades do produto

- identidade e perfil;
- programas, jornadas, trilhas, aulas, atividades e biblioteca;
- diagnóstico e personalização autorizada;
- quick checks, avaliações, práticas, entregas e comentários;
- pontos, ranking, badges, recompensas e certificados;
- campanhas, B2B e CMS;
- eventos, auditoria, outbox e projeções;
- administração de conteúdo, usuários, permissões e configurações.

## Proibições

A plataforma não deve:

- usar segredo ou credencial como configuração pública;
- apresentar metodologia não aprovada como oficial;
- permitir autorização apenas visual;
- expor e-mail completo de terceiros em ranking público/participante;
- usar dados educacionais como decisão de crédito sem governança específica;
- confirmar escrita de domínio somente depois de resposta de integração externa;
- contornar migrations com mudança manual tratada como fonte de verdade;
- usar mocks ou números estáticos como se fossem dados reais em ambiente operacional.

## Extensibilidade

Novas jornadas e parceiros entram por dados, configuração e adapters. Uma nova capacidade de negócio pode exigir código; uma nova instância de conteúdo comum não deve exigir fork do núcleo.