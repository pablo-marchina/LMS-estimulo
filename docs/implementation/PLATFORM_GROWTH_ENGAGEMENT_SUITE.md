# Crescimento, engajamento e extensões

Este documento descreve as capacidades transversais de aquisição, conteúdo, participação, gamificação e administração que complementam o núcleo de jornadas.

## Princípios

- PostgreSQL é a fonte operacional e histórica;
- integrações externas consomem outbox genérica;
- saldo, estoque, publicação, aceite e acesso são transacionais e idempotentes;
- diagnósticos opcionais não alteram o diagnóstico principal;
- o score comportamental é exclusivamente analítico e não controla a experiência do participante;
- não existe reconstrução de eventos antigos que não tenham sido capturados na origem;
- preview administrativo não registra progresso, pontos, respostas ou entregas;
- estruturas internas como UUID, hash, bytes ou JSON não são a linguagem de edição da interface administrativa.

## Administração

As áreas administrativas organizam capacidades por domínio: configurações, campanhas, B2B, recompensas, entregas, diagnóstico, comportamento, gamificação, biblioteca, jornadas e interface. Aliases legados podem existir apenas como compatibilidade de navegação, sem manter uma segunda implementação do mesmo editor.

## Documentos legais

Termos e políticas possuem versionamento próprio. Uma publicação pode exigir nova aceitação; o aceite preserva usuário, versão, data e contexto necessário para auditoria.

## Preview da interface

O preview reutiliza a experiência real por uma sessão administrativa isolada. Escritas, trackers e efeitos de participante são bloqueados no servidor. A comunicação entre editor e preview respeita mesma origem e allowlists de operações.

## Jornadas, biblioteca e mídia

Programas agrupam jornadas. Temas são entidades administráveis e reutilizáveis. Conteúdos e jornadas podem se relacionar a múltiplos temas sem armazenar taxonomia como texto livre.

Players e componentes de mídia respeitam o container e a viewport. Perguntas rápidas e avaliações derivam sua estrutura da configuração persistida, não de limites fixos na interface.

## Aquisição e campanhas

Links de campanha podem transportar atribuição, destino e regras de disponibilidade, mas nunca contornam autenticação, autorização, RBAC, elegibilidade ou políticas B2B. A associação de uma visita a uma conta acontece somente depois de identidade válida.

## B2B

Páginas B2B possuem publicação, disponibilidade e controle de acesso por usuário/grupo. Participantes não autorizados não recebem o conteúdo nem pela UI nem pela leitura server-side.

## Recompensas

Carteira e catálogo de recompensas são separados do ledger de engajamento. Conversão e resgate usam idempotência; saldo e estoque são alterados de forma transacional. Cancelamentos produzem compensações auditáveis.

## Entregas e avaliação

Entregas configuram formatos, prazos, tentativas, critérios, referências e estratégia de revisão. Arquivos são validados e privados. Avaliação automatizada ou assistida não inventa resultado quando evidência ou confiança são insuficientes; nesses casos o fluxo segue a política de revisão humana.

## Diagnósticos

Somente o diagnóstico principal pode produzir a atribuição principal de arquétipo quando a configuração autorizar. Diagnósticos opcionais mantêm sessões, respostas e resultados próprios.

## Eventos e score comportamental

Eventos de comportamento são validados e minimizados no servidor. O score analítico preserva versão do modelo, cobertura e inputs necessários para explicação. Ele não determina acesso, navegação, recompensa, recomendação ou crédito.

## ETL

Produtores persistem estado, evento e outbox sem conhecer o destino. Consumidores externos devem implementar lease, cursor, deduplicação, retry, dead letter e reconciliação. Exportação externa permanece desligada quando não houver consumidor aprovado.

## Segurança

RPCs privilegiadas validam ator, organização, permissão e idempotência. Tabelas de aplicação mantêm RLS conforme o modelo de segurança. Buckets são privados, URLs assinadas são temporárias e operações administrativas relevantes geram auditoria.
