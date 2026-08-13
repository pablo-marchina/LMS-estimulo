# Matriz canônica de correções — Consolidado de Testes Soki/Estímulo

> Fonte de verdade: Google Doc `Consolidado_Testes_Soki_Priorizado.md`, documento `1IwLbhFRf9_F4cTZJHLK8AEvqVS13yAOus49yNZ2Y65g`, aba `t.0`, revisão `AIroW37KIAFJmT92NmXC5vYTyGwqiABMjoTcY61kRtM5y3lcNYT3ZpCuDu6BWrpdbwusIw8mnbs8oq0p04jGJfB0TPNDbjGvqkhb9p0kItU`.
>
> Esta matriz consolida itens repetidos do Slack, melhorias de 04/ago e 05/ago, seções P0/P1/P2 e o resumo executivo. Quando duas instruções entram em conflito, prevalece a instrução explícita mais recente. Benchmarks são referência de UX, não contratos literais.

## Regras de fechamento

Um item só pode chegar a **Validado em produção** quando há evidência de: regra estrutural/persistente, migration reproduzível quando aplicável, teste automatizado, validação admin, validação participante e persistência após refresh/nova sessão.

Estados permitidos:

- `ABERTO`: requisito não implementado ou bug confirmado.
- `PARCIAL`: implementação existe, mas falta parte do requisito.
- `IMPLEMENTADO`: código/schema existem, ainda sem prova runtime suficiente.
- `TESTADO`: testes automatizados e/ou integridade de dados comprovam o contrato.
- `VALIDADO_STAGING`: fluxo E2E autenticado validado em preview/staging.
- `VALIDADO_PRODUCAO`: fluxo e dados reais validados após deploy.
- `BLOQUEADO_EXTERNO`: limitação comprovada fora do controle da aplicação, com mitigação explícita.

Nenhum item pode ser fechado por patch manual de dados, hardcode específico de usuário, URL temporária persistida ou script one-off sem regra permanente.

## Ordem de execução

1. Matriz completa do documento.
2. Migrations/reprodutibilidade.
3. Jornada/assignments/backfill.
4. Ranking/pontuação.
5. Legal como fonte única.
6. Recompensas/transações.
7. Banners/CMS/login.
8. Diagnóstico/reordenação.
9. Biblioteca/arquétipos.
10. Entregas.
11. Certificado/compartilhamento.
12. Analytics/GA/UTM.
13. Uploads/thumbnails hardening.
14. Suite completa de testes.
15. E2E admin + participante novo + participante legado.
16. Deploy.
17. Auditoria de dados reais pós-deploy.

## A. Transversal, autenticação e identidade

| ID | Pri. | Requisito consolidado | Camada responsável | Critério de aceite | Estado atual |
|---|---|---|---|---|---|
| DOC-GEN-001 | P1 | Mostrar loading/skeleton em ações assíncronas | UI compartilhada | Navegações e submits longos exibem estado acessível | TESTADO |
| DOC-GEN-002 | P1 | Botão global de ajuda/suporte | UI + CMS/config | Acesso consistente a ajuda/WhatsApp fora do admin | TESTADO |
| DOC-GEN-003 | P2 | Substituir erro genérico por estado útil e rastreável | Error boundary | Retry, ajuda e referência técnica sem sugerir perda de dados | TESTADO |
| DOC-AUTH-001 | P0 | Recuperação de senha | Auth | `Esqueci minha senha` executa fluxo real de reset | IMPLEMENTADO |
| DOC-AUTH-002 | P1 | Mostrar/ocultar senha; reduzir erro de digitação | UI Auth | Toggle funcional; padrão conforme decisão de UX | IMPLEMENTADO |
| DOC-AUTH-003 | P2 | Acesso admin via Google discreto | UI Auth | Link `Sou da equipe Estímulo` secundário no rodapé | IMPLEMENTADO |
| DOC-AUTH-004 | P2 | Copy final de cadastro | UI/CMS | Eyebrow, H1, explicação CPF, CTA e links iguais ao documento | PARCIAL |
| DOC-AUTH-005 | P2 | Copy final de login | UI/CMS | H1/apoio/CTA/cadastro/admin iguais ao documento | PARCIAL |
| DOC-AUTH-006 | P2 | Copy institucional desktop do login | UI/CMS | `Seu negócio evolui...`, Descubra/Desenvolva/Evolua; remover texto legado | ABERTO |
| DOC-AUTH-007 | P2 | Remover `CURSO EM DESTAQUE` hardcoded da landing | UI | Seção inexistente ou 100% CMS-driven | IMPLEMENTADO |
| DOC-USR-001 | P0 | Novo usuário aparecer no admin | IAM + admin read model | Auth criado -> conta IAM visível sem exigir membership manual | TESTADO |
| DOC-USR-002 | P1 | Busca e mais dados na gestão de usuários | Admin | Busca por nome/e-mail + dados relevantes | IMPLEMENTADO |
| DOC-USR-003 | P1 | Admin conseguir ajudar em problemas de login | Auth/Admin | Reset/recovery seguro disponível pela gestão | IMPLEMENTADO |

## B. Home, banners, headers e CMS

| ID | Pri. | Requisito consolidado | Camada responsável | Critério de aceite | Estado atual |
|---|---|---|---|---|---|
| DOC-HOME-001 | P0 | CTA `Fazer diagnóstico` clicável para conta sem diagnóstico | Home + diagnostic resolver | Nova conta inicia o diagnóstico publicado correto | IMPLEMENTADO |
| DOC-HOME-002 | P2 | Saudação `👋 Olá, [nome]!` | CMS/UI | Nome real + emoji correto | IMPLEMENTADO |
| DOC-HOME-003 | P1 | Ordem da Home: header -> banner -> continuar trilha -> restante | Home layout | Ordem mais recente de 05/ago em todos os breakpoints | IMPLEMENTADO |
| DOC-HOME-004 | P1 | `Continuar trilha` retomar última/próxima aula relevante | Learning read model | CTA abre atividade correta, não reinicia jornada | TESTADO |
| DOC-HOME-005 | P1 | Selos destacados configuráveis | Admin + read model | Admin escolhe quais badges aparecem na Home | IMPLEMENTADO |
| DOC-HOME-006 | P1/P2 | Textos da Home configuráveis e copy solicitada | CMS | Descubra/Novidades/saudação/copy não dependem de hardcode | IMPLEMENTADO |
| DOC-CMS-001 | P1 | Headers das abas do participante editáveis | CMS + assets | Admin altera imagem/conteúdo e participante consome publicação | TESTADO |
| DOC-CMS-002 | P1 | Expandir CMS para textos institucionais relevantes | CMS | Conteúdo institucional editável sem transformar regras de domínio em CMS | PARCIAL |
| DOC-BNR-001 | P0/P1 | Upload de banner não falhar | Upload infra + announcements | Intent/confirm/persistência sem falso erro | TESTADO |
| DOC-BNR-002 | P1 | Imagens distintas desktop/mobile | Announcements + Storage | `desktop_file_object_id` e `mobile_file_object_id`, fallback seguro | TESTADO |
| DOC-BNR-003 | P1 | Preview desktop/mobile + especificações | Admin upload UI | Dimensões/tamanho/tipo visíveis e preview dos dois assets | IMPLEMENTADO |
| DOC-BNR-004 | P1 | Display mobile correto | Participant banner | `<picture>`/source responsivo usa asset mobile | IMPLEMENTADO |
| DOC-BNR-005 | P2 | Banners compactos <= ~35–40% viewport | Shared banner component | Limite vale em mobile e desktop, inclusive widescreen | PARCIAL |
| DOC-BNR-006 | P1 | Banner inteiro clicável; remover `texto do botão` sem botão | Admin + participant | CTA é a imagem inteira; campo legado removido/ignorado | IMPLEMENTADO |
| DOC-BNR-007 | P1 | Excluir/arquivar banner no admin | Announcement lifecycle | Ação explícita segura; preferir archive para publicado | ABERTO |
| DOC-BNR-008 | P1 | Validade desativa banner | Announcement query | Fora da janela não aparece | TESTADO |
| DOC-BNR-009 | P1 | Vários banners alternam automaticamente | Carousel | Mais de um anúncio ativo rotaciona sem erro | TESTADO |

## C. Perfil, entregas e certificados externos

| ID | Pri. | Requisito consolidado | Camada responsável | Critério de aceite | Estado atual |
|---|---|---|---|---|---|
| DOC-PROF-001 | P1 | Perfil com abas Diagnóstico / Informações / Entregas | Participant UI | Três subseções estáveis | IMPLEMENTADO |
| DOC-PROF-002 | P2 | Copy final do Perfil | CMS/UI | `Seus dados, seu progresso...` | IMPLEMENTADO |
| DOC-PROF-003 | P0 | Salvar objetivo sem falso erro | RPC/server action | Persistir -> refresh -> reabrir preserva valor | TESTADO |
| DOC-PROF-004 | P0 | CTA `Fazer diagnóstico` do Perfil funcionar | Diagnostic resolver | Abre diagnóstico publicado apropriado | IMPLEMENTADO |
| DOC-PROF-005 | P2 | Objetivo no fim/integração coerente com diagnóstico | UX | Posicionamento não compete com diagnóstico | IMPLEMENTADO |
| DOC-DEL-001 | P1 | Entregas dentro de Perfil como `Meus materiais enviados` | Participant UI | Submissões e histórico ficam na aba de Perfil | IMPLEMENTADO |
| DOC-DEL-002 | P1 | Tela admin para gerenciar entregas | Admin + submission domain | Lista, review, feedback/nota/status | IMPLEMENTADO |
| DOC-DEL-003 | P1 | Configuração de entrega por aula/conteúdo | Domain + admin | Tipos, limites, deadline, tentativas, rubrica, review | IMPLEMENTADO |
| DOC-DEL-004 | P1 | Fluxo E2E de submissão persistente | Storage + submissions | Enviar -> sair -> reabrir -> revisar -> feedback | IMPLEMENTADO |
| DOC-CEXT-001 | P2 | Copy/subtítulo final da carteira de certificados | CMS/UI | Texto final do documento | IMPLEMENTADO |
| DOC-CEXT-002 | P1 | Dropdown organizações parceiras | Certificate domain | Sebrae, Aliança Empreendedora, Be.labs, Emperifa, Outros | IMPLEMENTADO |
| DOC-CEXT-003 | P2 | Labels finais do certificado externo | UI | Nome do curso, Instituição, Validade opcional etc. | IMPLEMENTADO |
| DOC-CEXT-004 | P0 | Certificado externo não sumir após upload | Storage + certificate DB | Upload -> confirmação -> refresh/nova sessão mantém registro e arquivo | TESTADO |

## D. Jornadas, trilhas e aulas

| ID | Pri. | Requisito consolidado | Camada responsável | Critério de aceite | Estado atual |
|---|---|---|---|---|---|
| DOC-JRN-001 | P0 | Jornada OpenAI carregar completa para todos | Assignment domain | Toda instância elegível reflete todas as trilhas publicadas; self-healing/idempotência | ABERTO |
| DOC-JRN-002 | P1 | Jornada destaque também aparecer em `Em andamento` | Read model | Ativa + destaque aparece nas duas seções corretas | TESTADO |
| DOC-JRN-003 | P1 | Reduzir cliques até aula | Navigation UX | Home/continuar abre destino mais direto sem etapas redundantes | IMPLEMENTADO |
| DOC-JRN-004 | P1 | Abrir aula de forma mais fluida/possível dentro da trilha | UX | Solução reduz transições sem quebrar URL/acessibilidade | PARCIAL |
| DOC-JRN-005 | P1 | Admin editar aula sem campos irrelevantes obrigatórios | Server actions/forms | Partial update real; campos não relacionados não bloqueiam | IMPLEMENTADO |
| DOC-JRN-006 | P1 | Editar/excluir/arquivar jornada | Lifecycle/versioning | Draft pode arquivar/excluir seguro; publicado preserva histórico | TESTADO |
| DOC-JRN-007 | P1 | Editar/excluir/arquivar trilha | Lifecycle/versioning | Bloquear trilha padrão/em uso; confirmação explícita | TESTADO |
| DOC-JRN-008 | P2 | Copy final das seções de Jornadas | CMS/UI | Em andamento/recomendadas/outras/concluídas conforme documento | IMPLEMENTADO |
| DOC-JRN-009 | P2 | Remover `obrigatória` | UI | Termo não aparece no participante | TESTADO |
| DOC-JRN-010 | P2 | Remover `JORNADA EM DESTAQUE` da tela interna | UI/CMS | Selo não aparece indevidamente | IMPLEMENTADO |
| DOC-LES-001 | P0 | Concluir aula = +5 pontos | Learning event + gamification | `learning.activity.completed` gera exatamente +5 uma vez por atividade | IMPLEMENTADO |
| DOC-LES-002 | P0 | Conclusão refletir imediatamente após ação | Cache/revalidation | UI muda para concluída sem refresh manual | IMPLEMENTADO |
| DOC-LES-003 | P0/P1 | Etiqueta `CONCLUÍDO` visível também na visão da trilha | Outline read model | Atividade concluída identificável fora da página da aula | IMPLEMENTADO |
| DOC-LES-004 | P1 | Remover barra Diagnóstico/Jornada/Resultado dentro da aula | Lesson layout | Barra antiga ausente durante aula | TESTADO |
| DOC-LES-005 | P1 | Próxima aula explícita e funcional | Lesson navigation | CTA visível, não cortado, destino correto | IMPLEMENTADO |
| DOC-LES-006 | P0 | Abas Conteúdo/Verificação/Prática/Discussão não sumirem após comentar | Lesson tabs | Comentário preserva tabs e estado | TESTADO |
| DOC-LES-007 | P1 | Persistir posição de vídeo onde API permite | Player persistence | Pausar/sair/retornar restaura posição em players controláveis | IMPLEMENTADO |
| DOC-LES-008 | P1 | Google Drive: conclusão manual explícita por limitação de iframe | UX + event | `Concluí este conteúdo` conclui/gera evento; limitação documentada | BLOQUEADO_EXTERNO |
| DOC-LES-009 | P1 | Subtítulo/título de vídeo editável pelo admin | Content domain | Edita metadado sem recriar quiz/prática | IMPLEMENTADO |
| DOC-LES-010 | P1 | Reduzir tamanho do vídeo | Lesson responsive UI | Player não domina viewport; mantém acessibilidade | IMPLEMENTADO |
| DOC-LES-011 | P1 | Coletar/visualizar dados de uso do conteúdo da aula | Analytics | Eventos de conteúdo/mídia persistem e são consultáveis | TESTADO |
| DOC-LES-012 | P1 | Thumbnail de aula configurável e clicável | Storage + outline | Admin salva `file_object_id`; todos autorizados resolvem e card abre aula | TESTADO |

## E. Diagnóstico e resultado

| ID | Pri. | Requisito consolidado | Camada responsável | Critério de aceite | Estado atual |
|---|---|---|---|---|---|
| DOC-DIAG-001 | P0 | Diagnóstico publicado aparecer no dropdown como `em uso` | Admin read model | Publicado explícito no seletor | TESTADO |
| DOC-DIAG-002 | P0 | Diagnóstico aparecer para admins | Admin auth/read model | Admin autorizado lista versão publicada/drafts | IMPLEMENTADO |
| DOC-DIAG-003 | P0 | Nova conta conseguir iniciar diagnóstico | Provisioning + resolver | Sem dados legados/manuais | IMPLEMENTADO |
| DOC-DIAG-004 | P1 | Admin editar blocos novos do resultado | Diagnostic presentation config | Strengths/challenge/tips/phrase editáveis por perfil/config | IMPLEMENTADO |
| DOC-DIAG-005 | P1 | Adicionar/excluir perguntas | Versioned builder | CRUD preserva histórico publicado | IMPLEMENTADO |
| DOC-DIAG-006 | P1 | Reordenar perguntas explicitamente | Versioned builder | Campo/ação de `position`, reordenação persistente e transacional | ABERTO |
| DOC-DIAG-007 | P0 | Scores/thresholds não inteiros | Domain schema/UI | Decimal aceito ponta a ponta | TESTADO |
| DOC-DIAG-008 | P1 | Uma pergunta por vez | Participant flow | Stepper/multi-step com progresso e autosave | IMPLEMENTADO |
| DOC-DIAG-009 | P0 | Pós-submit ir para resultado | Server action/navigation | Sucesso redireciona ao resultado, fora de catch de persistência | TESTADO |
| DOC-DIAG-010 | P0 | Conclusão contabilizar pontos | Atomic RPC + event | Concluir sessão + pontuar idempotente | TESTADO |
| DOC-DIAG-011 | P2 | Não exibir slug técnico | Presentation model | `capacitacao_ia_mei_openai` não aparece como copy | IMPLEMENTADO |
| DOC-DIAG-012 | P2 | Copy de introdução final | CMS/config | Texto `Conheça seu perfil...` | IMPLEMENTADO |
| DOC-DIAG-013 | P1/P2 | Resultado com novos blocos | Result view model | Pontos fortes, próximo desafio, dicas, frase, próximos passos | IMPLEMENTADO |
| DOC-DIAG-014 | P2 | Copy final do resultado (`Um olhar mais de perto`, `Seu jeito de empreender`, etc.) | Result UI/CMS | Textos atuais seguem decisão final | IMPLEMENTADO |
| DOC-DIAG-015 | P2 | Legibilidade/contraste e espaçamento do header | UI/accessibility | Sem sobreposição; contraste adequado | IMPLEMENTADO |
| DOC-DIAG-016 | P2 | Representação gráfica compreensível | Result UI | Gráfico/barras legíveis para público-alvo | IMPLEMENTADO |
| DOC-DIAG-017 | P1 | Resultado não expor regra interna de classificação | View model/API | Pesos/thresholds/cálculos internos não vão ao cliente | IMPLEMENTADO |

## F. Biblioteca e temas

| ID | Pri. | Requisito consolidado | Camada responsável | Critério de aceite | Estado atual |
|---|---|---|---|---|---|
| DOC-LIB-001 | P0 | Excluir/arquivar arquivo da Biblioteca sem erro | Content lifecycle + storage | Em uso é protegido; não usado arquiva/remove seguro | IMPLEMENTADO |
| DOC-LIB-002 | P1 | Busca textual por título/descrição/keywords | Search/read model | Termos relevantes retornam conteúdo elegível | TESTADO |
| DOC-LIB-003 | P1 | Conteúdo de jornada só entra na Biblioteca quando marcado visível | Content publication | Flag de visibilidade determina catálogo | TESTADO |
| DOC-LIB-004 | P1 | Filtro Tema derivado dos temas cadastrados no admin | Topic domain | Participante não usa lista hardcoded | TESTADO |
| DOC-LIB-005 | P0/P1 | Salvar tema como `contabilidade` | Topic CRUD | Persistência normalizada, sem falha | TESTADO |
| DOC-LIB-006 | P1 | Filtro por arquétipo/perfil | Diagnostic profile targeting | Conteúdo pode ser alvo de um/múltiplos/todos perfis | ABERTO |
| DOC-LIB-007 | P2 | Botão `BUSCAR` em vez de `Aplicar filtros` | UI | Copy final | IMPLEMENTADO |
| DOC-LIB-008 | P1 | Ícone/tipo de conteúdo visível | UI | Vídeo/documento/interativo etc. distinguíveis | IMPLEMENTADO |

## G. Pontuação, ranking e recompensas

| ID | Pri. | Requisito consolidado | Camada responsável | Critério de aceite | Estado atual |
|---|---|---|---|---|---|
| DOC-PTS-001 | P0 | Seção de pontuação admin funcionar | Admin + gamification RPCs | Listar/criar/editar regras sem erro | IMPLEMENTADO |
| DOC-PTS-002 | P0 | Evento `concluir diagnóstico` configurável | Event catalog | Opção disponível e conectada ao evento real | TESTADO |
| DOC-PTS-003 | P0 | `Regra Existente` carregar campos | Admin editor | Seleção popula todos os campos da versão efetiva | TESTADO |
| DOC-PTS-004 | P1 | Regra para envio de certificado | Event catalog/rules | Acontecimento existe/é configurável conforme política definida | IMPLEMENTADO |
| DOC-PTS-005 | P2 | Explicar `Máximo no período` | Admin UX | Help text ou remoção se sem utilidade | PARCIAL |
| DOC-PTS-006 | P2 | Explicar/remover `Aprovar-se` | Admin UX/event naming | Sem ação ambígua para admin | PARCIAL |
| DOC-PTS-007 | P1 | Recompensas vira hub único | Participant IA | Saldo, como conseguir pontos, histórico, ranking, catálogo/resgates | IMPLEMENTADO |
| DOC-PTS-008 | P1 | Remover tela/menu standalone de Pontuação/Entregas conforme IA final | Navigation | Navegação principal segue estrutura consolidada | IMPLEMENTADO |
| DOC-PTS-009 | P1 | `Como ganhar pontos` dentro de Recompensas | Participant UI | Modal/aba/link contextual, sem página isolada | IMPLEMENTADO |
| DOC-PTS-010 | P1 | Ranking/histórico como abas de Recompensas | Participant UI | Acessíveis no hub | IMPLEMENTADO |
| DOC-PTS-011 | P0 | Ledger e projeção de saldo sempre consistentes | Gamification DB | Soma ledger = saldo projetado; idempotência sem duplicatas | TESTADO |
| DOC-PTS-012 | P0 | Ranking tratar empates corretamente | Ranking RPC | Mesma pontuação -> mesma posição; UUID só ordena exibição | ABERTO |
| DOC-RWD-001 | P0 | Salvar recompensa sem falso erro | Admin action + domain | Persistir/reabrir sem mensagem de falha após sucesso | IMPLEMENTADO |
| DOC-RWD-002 | P1 | Imagem da recompensa | Storage + reward asset | Admin upload/preview; participante renderiza por ID estável | IMPLEMENTADO |
| DOC-RWD-003 | P0/P1 | Resgate atômico | Reward transaction | Validar saldo/estoque/limite -> redemption + débito + estoque numa transação idempotente | IMPLEMENTADO |
| DOC-RWD-004 | P1 | Estoque, limite, janela e status | Reward domain | Regras aplicadas no servidor sob concorrência | IMPLEMENTADO |

## H. Certificados emitidos/admin

| ID | Pri. | Requisito consolidado | Camada responsável | Critério de aceite | Estado atual |
|---|---|---|---|---|---|
| DOC-CERT-001 | P0 | Template salvo continuar localizável/editável | Certificate assets/read model | Salvar -> sair -> reabrir -> editar | TESTADO |
| DOC-CERT-002 | P1 | Upload de template com especificações/preview | Storage + admin | Upload seguro, dimensões informadas, preview persistente | IMPLEMENTADO |
| DOC-CERT-003 | P1 | Posicionar caixas de texto | Template editor | Nome/curso/data/código configuráveis visualmente | IMPLEMENTADO |
| DOC-CERT-004 | P0/P1 | Logo e assinatura persistirem após etapa 1 | Storage + issuer media | Salvar -> reabrir mantém ambos os `file_object_id` | IMPLEMENTADO |
| DOC-CERT-005 | P1 | ID único por certificado | Certificate issuance | Código único como `EST-...`, validável | IMPLEMENTADO |
| DOC-CERT-006 | P1 | Conteúdo mínimo de credibilidade | Template/issuance | Nome, curso, data, instituição, assinatura, número | IMPLEMENTADO |
| DOC-CERT-007 | P1 | Compartilhar certificado | Shared ShareAction + validation URL | Web Share/clipboard + URL estável de validação + telemetry | ABERTO |
| DOC-CERT-008 | P1 | Validar certificado público | Validation read model | Código/URL confirma autenticidade sem expor arquivo privado | IMPLEMENTADO |

## I. Legal, ajuda e comunicação

| ID | Pri. | Requisito consolidado | Camada responsável | Critério de aceite | Estado atual |
|---|---|---|---|---|---|
| DOC-LEG-001 | P1 | Incluir Termos de Uso na plataforma | Legal domain/UI | Página pública disponível | IMPLEMENTADO |
| DOC-LEG-002 | P1 | Termos editáveis no admin | Legal versioning | Draft/publicação versionados | IMPLEMENTADO |
| DOC-LEG-003 | P0/P1 | Página pública consumir exatamente a versão legal publicada | Legal read model | Admin publica vN -> `/termos` mostra vN | ABERTO |
| DOC-LEG-004 | P0/P1 | Privacidade consumir exatamente a versão publicada | Legal read model | Admin publica vN -> `/privacidade` mostra vN | ABERTO |
| DOC-LEG-005 | P1 | Aceite registrar versão efetivamente aceita | Consent domain | `user + legal_document_version_id + accepted_at` | ABERTO |
| DOC-LEG-006 | P1 | Reaceite quando versão exigir | Consent gating | Nova versão com flag força aceite antes de prosseguir | IMPLEMENTADO |
| DOC-HELP-001 | P1 | Telefone de ajuda editável | Config/CMS | Admin altera e `/ajuda` reflete | TESTADO |
| DOC-HELP-002 | P1 | Botão/comunidade WhatsApp | Config/UI | Link configurável e funcional | TESTADO |

## J. Analytics, UTM e compartilhamento

| ID | Pri. | Requisito consolidado | Camada responsável | Critério de aceite | Estado atual |
|---|---|---|---|---|---|
| DOC-AN-001 | P1 | Checar/operar Google Analytics | Runtime env + CSP + GA | Tag carrega em deploy alvo e eventos/pageviews chegam | ABERTO |
| DOC-AN-002 | P1 | Analytics first-party de uso da plataforma | Telemetry domain | Eventos autenticados, same-origin, idempotentes e consultáveis | TESTADO |
| DOC-AN-003 | P1 | Analytics de conteúdo/aula | Media/content telemetry | Open/start/progress/complete e interações relevantes | TESTADO |
| DOC-UTM-001 | P1 | Campanhas UTM direcionarem para página interna | Tracking domain | slug/UTM válido registra visita e redireciona apenas internamente | IMPLEMENTADO |
| DOC-UTM-002 | P1 | Janela/status/limite de campanha | Tracking RPC | Inativa/futura/expirada/limite rejeitam sem registrar incorreto | IMPLEMENTADO |
| DOC-UTM-003 | P1 | Visualizar métricas de campanhas | Admin | Visitas e dimensões principais disponíveis | IMPLEMENTADO |
| DOC-SHARE-001 | P1 | Compartilhar diagnóstico | Shared ShareAction | Web Share + clipboard + telemetry/gamificação | TESTADO |
| DOC-SHARE-002 | P1 | Compartilhar certificado | Shared ShareAction | Mesmo contrato do diagnóstico com URL pública estável | ABERTO |
| DOC-SHARE-003 | P1 | Compartilhar em redes sociais com gamificação | Event + points | Evento canônico e regra idempotente quando habilitada | IMPLEMENTADO |

## K. Uploads, Storage e hardening

| ID | Pri. | Requisito consolidado | Camada responsável | Critério de aceite | Estado atual |
|---|---|---|---|---|---|
| DOC-UP-001 | P1 | Toda seção de upload mostrar especificações | Shared upload component | Tipo, tamanho, quantidade/dimensões quando aplicável | IMPLEMENTADO |
| DOC-UP-002 | P1 | Preview após seleção e do asset salvo | Shared upload component | Imagem/PDF/asset existente visíveis antes/depois do submit | IMPLEMENTADO |
| DOC-UP-003 | P0 | Persistir identidade estável, nunca signed URL | Storage domain | Entidades guardam `file_object_id`; URL é resolvida sob demanda | TESTADO |
| DOC-UP-004 | P0 | Upload intent/confirm/scan íntegro | Storage DB | Sem `clean` sem verificação, sem objetos sem intent | TESTADO |
| DOC-UP-005 | P1 | Resolver mídia privada com autorização comum | Storage gateway | Owner/participante/admin respeitam política; não autorizado falha | PARCIAL |
| DOC-UP-006 | P1 | Detectar órfãos/referências quebradas | Integrity suite | Query/gate = zero refs inválidas após deploy | TESTADO |

## L. Reprodutibilidade, migrations e release

| ID | Pri. | Requisito consolidado | Camada responsável | Critério de aceite | Estado atual |
|---|---|---|---|---|---|
| DOC-DB-001 | P0 | Banco reconstruir de zero até latest | Migration history | Replay canônico completo verde | ABERTO |
| DOC-DB-002 | P0 | Migration de reward assets respeitar ordem de dependências | Migrations | Relações existem antes de uso; sem `IF EXISTS` mascarando dependência | ABERTO |
| DOC-DB-003 | P0 | Upgrade de schema production-like -> latest | Migration tests | Snapshot/schema anterior aplica latest sem intervenção manual | ABERTO |
| DOC-DB-004 | P0 | Gateway autenticado cobrir todas RPCs usadas pela app | RPC gateway validator | CI detecta chamada sem allowlist | TESTADO |
| DOC-DB-005 | P0 | Preservar contratos congelados/compatibilidade | Architecture validators | E14 e publisher novo coexistem onde necessário | TESTADO |
| DOC-CI-001 | P0 | Web CI verde | GitHub Actions | Typecheck/build/contracts/security passam | TESTADO |
| DOC-CI-002 | P0 | Database gates verdes | GitHub Actions | Replay + DB validators passam | ABERTO |
| DOC-CI-003 | P0 | Reproducibility verde Linux/Windows + DB | GitHub Actions | Clean install/build e replay passam | ABERTO |
| DOC-REL-001 | P0 | Preview/staging representar exatamente o head auditado | Vercel | SHA do deploy = SHA validado | ABERTO |
| DOC-REL-002 | P0 | Produção só após gates + E2E | Release process | Sem promoção com gate vermelho | ABERTO |

## M. Testes e validação final

| ID | Pri. | Requisito consolidado | Camada responsável | Critério de aceite | Estado atual |
|---|---|---|---|---|---|
| DOC-TST-001 | P0 | Testes DB de invariantes | DB test suite | Assignments, ledger, ranking, legal, rewards, uploads, UTM | PARCIAL |
| DOC-TST-002 | P0 | Testes de regressão para cada bug corrigido | CI | Cada bug histórico possui teste que falharia antes do fix | PARCIAL |
| DOC-TST-003 | P0 | E2E admin completo | E2E | Criar/salvar/reabrir/editar/publicar/arquivar em todas áreas | ABERTO |
| DOC-TST-004 | P0 | E2E participante novo | E2E | Cadastro -> diagnóstico -> jornada -> aula -> pontos -> certificados/rewards | ABERTO |
| DOC-TST-005 | P0 | E2E participante legado | E2E | Dados antigos recebem backfills/self-healing sem perda de progresso | ABERTO |
| DOC-TST-006 | P0 | E2E responsivo | Visual/E2E | Mobile/tablet/desktop/widescreen para banners/aulas/home | ABERTO |
| DOC-TST-007 | P0 | Smoke pós-deploy | Production verification | Auth/public pages/CMS/journey/library/legal/storage/telemetry respondem | ABERTO |
| DOC-TST-008 | P0 | Auditoria de invariantes em dados reais | Post-deploy SQL | Zero jornada truncada, refs quebradas, divergência ledger, ranking inválido etc. | ABERTO |

## Gaps bloqueadores já comprovados na auditoria

1. **Replay do banco falha** na migration `20260812233000_structural_lesson_gamification_media_fixes.sql` ao usar `engagement.reward_asset_links` antes de a relação existir no histórico reproduzido.
2. **Jornada OpenAI possui instâncias truncadas**: a versão publicada tem 7 trilhas/22 aulas, mas existem participantes com 1/7 e 0/7 assignments de trilha.
3. **Ranking trata empate incorretamente** porque o identificador do participante participa do `dense_rank`, fazendo pontuações iguais receberem posições diferentes.
4. **Legal tem duas fontes de verdade**: o admin possui versionamento, mas `/termos` e `/privacidade` ainda usam corpo hardcoded; aceite ainda precisa referenciar a versão publicada efetiva.
5. **Google Analytics não está operacional no preview auditado**: componente existe, mas tag não carrega e CSP não contempla os endpoints necessários.
6. **Compartilhamento de certificado está ausente**; diagnóstico já usa o componente compartilhável.
7. **Biblioteca ainda usa nível genérico**, não targeting explícito por arquétipo/perfil.
8. **Banner desktop não impõe o limite de ~35–40% da viewport** em todos os tamanhos.
9. **Admin não expõe lifecycle explícito de arquivar/excluir banner**.
10. **Copy institucional desktop do login ainda diverge do texto final solicitado**.

## Invariantes de encerramento pós-deploy

A auditoria só pode ser encerrada quando todas as consultas abaixo retornarem zero violações:

- instâncias de jornada com assignments faltantes para a versão publicada;
- `file_object_id` referenciando objeto inexistente/deletado/indisponível;
- soma do ledger diferente da projeção de saldo;
- participantes com mesmos pontos e ranking inconsistente;
- documento legal ativo sem versão publicada única;
- consentimento sem referência de versão legal quando obrigatório;
- estoque de recompensa negativo ou redemption sem débito correspondente;
- sessões de diagnóstico apontando para versão inexistente;
- thumbnails configuradas sem arquivo resolvível;
- eventos pontuáveis duplicados por ausência de idempotência.

## Definition of Done global

O documento é considerado 100% implementado somente quando **todos** os itens aplicáveis desta matriz estão em `VALIDADO_PRODUCAO` ou, para limitações externas comprovadas, `BLOQUEADO_EXTERNO` com mitigação aceita; `main` reconstrói o banco do zero; upgrade de schema passa; todos os gates estão verdes; participante novo e legado percorrem o fluxo completo; admin percorre todos os CRUDs; e a auditoria pós-deploy retorna zero violações de invariantes.