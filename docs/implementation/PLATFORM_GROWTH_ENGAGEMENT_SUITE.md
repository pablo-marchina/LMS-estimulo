# Suíte de crescimento, engajamento e extensões

**Status:** implementada no código versionado; migrations e Edge Functions aplicadas no ambiente Supabase conectado de desenvolvimento, teste e preview  
**Escopo:** administração, aquisição, biblioteca, jornadas, avaliações, recompensas, B2B, eventos e exportação futura

## 1. Princípios invariantes

- PostgreSQL é a fonte operacional e histórica.
- Integrações externas futuras consomem uma outbox genérica; nenhum destino externo é dependência do produto.
- Operações de saldo, estoque, publicação, aceite e acesso são transacionais e idempotentes.
- Diagnósticos opcionais não alteram arquétipo nem elegibilidade de jornadas.
- O score comportamental é exclusivamente analítico e não interfere na experiência do participante.
- A captura comportamental começa na implantação desta suíte; não existe reconstrução de eventos antigos.
- Links de aquisição nunca contornam autenticação, autorização, RBAC ou regras B2B.
- Prévia administrativa não registra progresso, pontos, visualizações, respostas ou entregas.
- Estruturas internas como JSON, UUID, bytes, hashes e objetos de entrega não são campos de edição para administradores; a interface traduz essas estruturas em perguntas, opções e unidades compreensíveis.
- Recursos relacionados permanecem consolidados nas telas que já representam o domínio, evitando menus e páginas independentes desnecessárias.

## 2. Superfícies administrativas

| Área | Rota | Responsabilidade |
|---|---|---|
| Mais configurações | `/admin/configuracoes` | identidade da plataforma, suporte, documentos legais e temas |
| Campanhas | `/admin/campanhas` | links UTM, destino, validade, público e etapas ignoráveis |
| B2B | `/admin/b2b` | páginas por blocos, publicação, usuários e grupos |
| Recompensas | `/admin/recompensas` | catálogo, estoque, período, regulamento e resgates |
| Entregas | `/admin/entregas` | configurações guiadas, critérios, tentativas, IA e revisão humana |
| Diagnósticos | `/admin/diagnostico` | diagnóstico principal e diagnósticos opcionais no perfil, separados por abas |
| Comportamento | `/admin/comportamento` | eventos, dimensões e snapshots analíticos |
| Pontuação e certificados | `/admin/gamificacao` | pontos, selos, emissão e modelos de certificados em uma única área |
| Biblioteca | `/admin/biblioteca` | conteúdo, temas, entregas e prévia participante |
| Jornadas | `/admin/produto` | programas, jornadas, trilhas, aulas, atividades e temas |
| Interface | `/admin/experiencia` | CMS visual com seleção direta de páginas e elementos |

As rotas antigas `/admin/certificados` e `/admin/diagnosticos-opcionais` permanecem somente como redirecionamentos de compatibilidade. Elas não aparecem na navegação nem mantêm uma segunda interface de edição.

O botão global de ajuda é ocultado apenas nas rotas `/admin`; os participantes continuam recebendo os contatos configurados.

## 3. Configurações gerais e documentos legais

A área **Mais configurações** concentra nome da plataforma, telefone, WhatsApp, e-mail e horário de suporte, links institucionais e texto de rodapé.

Termos de Uso e Política de Privacidade usam definição de versão com estados `draft`, `published` e `retired`. Uma versão publicada pode exigir nova aceitação. Enquanto houver versão obrigatória pendente, o layout participante apresenta o gate legal antes da navegação normal. A aceitação registra usuário, versão, data, origem e metadados.

## 4. CMS visual da interface

A tela **Interface** carrega uma prévia autenticada e da mesma origem da página real. O parâmetro `interface_preview=1` ativa a ponte de seleção sem criar uma versão artificial da tela.

Elementos registrados com `data-interface-content-key` recebem destaque visual. Ao clicar, a ponte `InterfacePreviewBridge` impede a ação normal do link ou botão e envia a chave selecionada à tela administrativa por `postMessage`. A tela pai aceita somente mensagens cuja origem seja a própria aplicação.

Uma lista lateral dos elementos da página funciona como alternativa de seleção. O administrador nunca edita HTML, JSON ou chaves internas; ele escolhe o elemento visual e altera os campos compatíveis com aquele tipo.

## 5. Programas, jornadas e temas

Programas são organizados dentro da própria tela **Jornadas**, em uma seção recolhível. O administrador pode criar e renomear programas e arquivar somente grupos sem jornadas ativas. A operação usa o mesmo gateway autenticado de produto, com permissão, idempotência e auditoria.

Temas são entidades da organização com código, nome, descrição, metadados visuais e estado. Conteúdos da biblioteca e jornadas aceitam múltiplos temas por relações próprias. Os formulários enviam IDs administrados; nomes livres não são fonte da taxonomia.

A exclusão de um tema é recusada quando possui vínculo. O administrador deve reclassificar os itens antes de retirá-lo.

## 6. Biblioteca, aulas e mídia

A biblioteca administrativa oferece uma prévia explícita que reutiliza os componentes participantes sem exigir `entrepreneur_id` e sem executar trackers ou mutações.

O player de mídia usa largura máxima de 960 px, respeita a largura do container e limita altura por `dvh`. O modo minimizado considera `100vw` e `100dvh`, impedindo que vídeo ou controles ultrapassem a tela.

Perguntas rápidas têm contagem dinâmica. Cliente e servidor usam o campo `quiz_question_count`; não existe limite fixo de três perguntas.

## 7. Certificados

A aba **Certificados**, dentro de **Pontuação**, concentra tanto a regra de emissão quanto os fundos usados no documento. Não existe uma tela administrativa independente de templates.

Templates aceitam PNG, JPG ou PDF e são armazenados como objetos verificados. A atribuição pode ter escopo:

1. `journey`;
2. `program`;
3. `global`.

A emissão resolve nessa ordem. O template configurado diretamente na versão antiga do certificado permanece apenas como fallback de compatibilidade. A associação ativa por escopo é única e pode possuir período de validade.

Na interface, esses escopos aparecem como **modelo de uma jornada**, **modelo de um programa** e **modelo geral**. IDs de arquivos e objetos de armazenamento não são exibidos.

## 8. Aquisição, UTM e redirecionamento

Links públicos em `/r/<slug>` configuram:

- UTMs padrão e parâmetros adicionais;
- destino pós-login;
- público `new`, `existing` ou `both`;
- início, término e limite de uso;
- parceiro, canal e observações;
- etapas que podem ser ignoradas, como onboarding, diagnóstico ou página inicial.

A captura registra visita anônima, token com hash, sessão, landing page, referenciador, dispositivo, navegador, sistema operacional, parâmetros e horário. Após login ou cadastro, o token é associado à conta e produz touchpoints de primeiro toque, último toque, cadastro e conversão quando aplicável.

O destino só é usado depois das validações normais. Uma URL B2B continua dependendo da concessão individual ou por grupo.

## 9. B2B

Administradores criam páginas versionadas por blocos de título, texto rico, imagem, vídeo, arquivo, botão, link, aviso, cards, separador e incorporação autorizada. Versões possuem rascunho, publicação e período de disponibilidade.

O editor apresenta blocos visuais, ordenação e campos comuns. O JSON usado para persistir a composição é gerado em campo oculto e não é uma superfície de edição.

O acesso pode ser concedido diretamente a usuários ou por grupos. A função `get_participant_extensions` filtra a consulta com `b2b_page_user_access` e `b2b_page_group_access`/`b2b_group_members`; usuários não autorizados não recebem a página e a rota direta retorna indisponibilidade.

## 10. Recompensas

A taxa inicial é `1 ponto de engajamento = 1 ponto de recompensa`, armazenada em configuração para conversões futuras. A carteira de recompensa é separada do ledger de engajamento.

O catálogo aceita recompensa física, digital, experiência ou serviço e configura:

- custo e limite por usuário;
- estoque opcional;
- início e encerramento;
- regulamento;
- dados necessários para entrega, como endereço, e-mail ou telefone;
- código, link, rastreamento e orientações de recebimento.

A interface administrativa transforma a configuração de entrega em caixas de seleção e campos nomeados. Objetos de fulfillment não são editados como JSON.

A experiência participante usa saldo destacado, próximo objetivo, barra de progresso, estados bloqueado/desbloqueado, cartões de conquista e histórico em formato de jornada. A gamificação é apenas visual: saldo, elegibilidade e resgate continuam determinados pelas transações do servidor.

Conversão e resgate usam idempotency key. O resgate bloqueia saldo e estoque na mesma transação. Estados administrativos cobrem pendência, aprovação, preparação, envio/disponibilização, entrega e cancelamento. Cancelar cria compensação no ledger, devolve saldo e restaura estoque quando aplicável.

## 11. Entregas e avaliação por IA

Entregas podem estar vinculadas a uma atividade ou a uma versão publicada da biblioteca. A configuração controla formatos, obrigatoriedade, quantidade e tamanho de arquivos, prazo, atraso, número de tentativas, reenvio, estratégia de nota, critérios, referências, instruções de IA e pontos.

O administrador define critérios por nome, descrição e importância; referências são informadas em linhas comuns; tamanho de arquivo é exibido em megabytes; e pontos usam campos separados. A aplicação converte esses dados para rubrica, material de referência, bytes e configuração de pontuação somente no servidor.

A rota `/api/delivery-uploads` valida origem, identidade, UUID, quantidade, tipo e tamanho, armazena evidências e só então executa `delivery_submit`. Falhas removem objetos recém-enviados.

A correção possui três modos:

- automática;
- IA com aprovação humana;
- IA como assistente, com decisão humana final.

O avaliador produz nota por critério, justificativa, pontos fortes, lacunas, recomendações, confiança e evidência. Baixa confiança, provedor indisponível ou evidência insuficiente mudam o estado para revisão humana.

Arquivos de código e ZIP recebem análise estática e nunca são executados. Áudio, vídeo, imagem e documento podem depender de extração/transcrição; quando a extração não é confiável, a plataforma não inventa nota.

## 12. Diagnósticos

A tela **Diagnósticos** possui duas abas: **Diagnóstico principal** e **Opcionais no perfil**. Somente um diagnóstico principal permanece publicado por vez e continua sendo o único responsável por arquétipo e elegibilidade de jornadas. Sua publicação exige mapeamento transacional entre perfis antigos e novos.

Diagnósticos opcionais são disponibilizados no perfil por público e período. Eles guardam sessões, tentativas, respostas, dimensões e resultados próprios. As ações `optional_start`, `optional_answer` e `optional_complete` não escrevem em `archetype_assignments` nem em `eligible_archetype_codes`.

Perguntas, opções, dimensões e perfis são dinâmicos. Inclusão, exclusão e reordenação são permitidas somente no rascunho; respostas históricas continuam ligadas à versão publicada usada.

## 13. Eventos e score comportamental

O browser envia observações autenticadas para `/api/behavior-events`. O servidor valida origem, usuário participante, nome do evento, ID idempotente, tamanho do payload e horário antes de executar `behavior_event`.

O evento estruturado pode registrar sessão, entidade, jornada, conteúdo, atividade, diagnóstico, recompensa, UTM e propriedades específicas. O evento bruto permanece preservado.

O score multidimensional consolida engajamento, consistência, profundidade, conclusão, autonomia, qualidade, evolução e frequência de retorno. Snapshots registram versão do modelo, cobertura, confiança, hash dos inputs e explicação.

Uso permitido: análise administrativa, relatórios e ETL. Uso proibido: acesso, navegação, jornadas, conteúdo, B2B, recompensas, recomendações, mensagens, elegibilidade ou qualquer alteração da experiência do participante.

## 14. ETL genérico

Produtores persistem estado, evento e outbox sem conhecer o destino externo. Um consumidor futuro deve:

- reivindicar lote com lease;
- exportar por cursor;
- deduplicar por evento/idempotency key;
- registrar tentativa e confirmação;
- reagendar falha transitória com backoff;
- enviar falha permanente para dead letter;
- reconciliar cursor, evento, payload hash e confirmação externa.

`ETL_EXPORT_ENABLED=false` é o padrão. A troca de destino não exige alterar fluxos transacionais do LMS.

## 15. Segurança e operação

As funções públicas de comando são `SECURITY DEFINER`, têm `search_path` fechado, validam ator, organização, permissão e idempotência e não concedem execução direta a `anon` ou `authenticated`. O frontend usa Edge Functions autenticadas como gateway.

As tabelas da suíte têm RLS habilitado e acesso direto de `public`, `anon` e `authenticated` revogado. A leitura e a escrita passam pelas funções autorizadas, mantendo isolamento por organização e participante.

Arquivos usam buckets privados e objetos identificados por chave opaca. URLs assinadas são temporárias e não são persistidas em eventos. Operações administrativas e revisões humanas registram ator, horário e motivo.

## 16. Configuração de IA

A Edge Function `ai-grade-submission` exige JWT válido. Quando `AI_GRADING_API_URL`, `AI_GRADING_API_KEY` e `AI_GRADING_MODEL` não estiverem configurados no ambiente do servidor, a entrega é preservada e encaminhada para revisão humana. Nenhum segredo é exposto por `NEXT_PUBLIC_*`.

## 17. Componentes de runtime

O runtime da suíte é composto por:

- RPCs `get_admin_extensions_workspace`, `get_participant_extensions`, `perform_participant_extension` e `save_admin_extension`;
- gateway de produto `save_admin_product_resource`, que também roteia a manutenção segura de programas;
- captura pública controlada `capture_tracking_visit`;
- resolução de certificados `get_certificate_render_payload`;
- funções de correção `get_delivery_grading_payload` e `apply_ai_delivery_review`;
- Edge Functions `platform-extensions-rpc` e `ai-grade-submission`;
- migrations de estrutura, comandos, herança de certificados, UTM/IA, programas e fechamento RLS.

## 18. Validação

A suíte é coberta por:

- contratos de UI → action/API → RPC;
- replay integral das migrations;
- equivalência do schema canônico;
- testes de aplicação, produto e integração;
- typecheck e build limpo em Linux e Windows;
- lint, auditoria de dependências, secret scanning, imagem Lambda e smoke/capacidade.

Resultados transitórios, SHA e logs pertencem ao pull request e aos artefatos do workflow, não a este documento permanente.
