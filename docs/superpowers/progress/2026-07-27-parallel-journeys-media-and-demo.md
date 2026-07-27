# Jornada paralela, mídia e demonstrações — 27/07/2026

## Auditoria da referência

A estrutura publicada anterior da jornada OpenAI não acomodava o desenho descrito em `estimulo-ref`: faltavam Boas-vindas, Fundamentos opcionais, marcos separados de avaliação/certificado e caminhos paralelos. O runtime também permitia apenas uma trilha ativa, criava aulas posteriores bloqueadas e calculava o progresso como `1/1`.

Os materiais originais ainda registram pendências editoriais P0 para mídias finais, transcrições/legendas, rubricas, parâmetros definitivos e homologação de credenciais. A nova versão é uma demonstração estrutural marcada como `demo_pending_homologation`, não uma alegação de conteúdo oficial final.

## Implementação viva

### OpenAI v2

- 7 trilhas;
- 22 atividades;
- 12 atividades obrigatórias;
- 10 atividades opcionais;
- todas as atividades disponíveis simultaneamente;
- progresso real por atividades obrigatórias;
- trilhas opcionais não impedem a conclusão-base;
- marcos de selos e certificados armazenados na configuração;
- apresentação configurável pelo administrador.

A matrícula participante ativa foi migrada da versão anterior para a v2. Não havia atividade concluída na matrícula; o histórico técnico anterior foi preservado e as atribuições antigas foram marcadas como substituídas.

### Segunda demonstração

Publicada: **Negócio em Movimento — Histórias, gestão e próximos passos**.

- 3 trilhas;
- 4 atividades;
- playlist oficial de Mentorias inspiracionais;
- página pública de Gestão e Marketing;
- plano interno de evolução em sete dias;
- página pública do UP Negócios;
- verificação rápida em cada atividade.

## Conteúdo e progresso

- vídeos e áudios registram progresso periodicamente;
- conclusão de mídia a partir de 90% ou ao terminar;
- a barra da atividade reage aos eventos de mídia sem recarregar;
- suporte a YouTube, playlists, Vimeo, vídeo nativo, áudio, imagem, PDF, arquivos internos e páginas externas;
- Biblioteca exibe os formatos compatíveis dentro da plataforma;
- arquivos privados usam autorização e URL assinada;
- atividade possui contexto relevante, nota de 1 a 5 estrelas, verificação curta configurável, prompts, leitura, prática e comentários.

## Administração

- destaque controlado por `presentation.featured` e `featured_rank`;
- texto superior, parceria, tom, ícone, temas e CTA configuráveis;
- trilhas obrigatórias ou opcionais;
- editor de aula suporta blocos internos, conteúdo externo genérico, perguntas rápidas, aprovação, tentativas e prática;
- gateway `authenticated-rpc` versão 12 com JWT;
- novos RPCs executáveis apenas por `service_role` e acessíveis à aplicação pelo gateway autenticado.

## Verificação

Deployment: `dpl_7LoP1udieLvFid3KLrteVN3rnUE6` — `READY`.

- 48/48 regressões aprovadas;
- Next.js compilado;
- TypeScript aprovado;
- páginas geradas;
- rotas de progresso e download geradas.

## Aceitação restante

Não houve percurso visual autenticado completo nesta sessão por ausência de credenciais/sessão de navegador. Nenhum bypass de autenticação foi criado. O PR deve permanecer em rascunho até essa validação.