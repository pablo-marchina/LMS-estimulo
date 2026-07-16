## Objetivo

<!-- Qual problema este PR resolve? -->

## Fonte e autoridade

<!-- Cite a fonte: premissas-desenvolvimento, documento do pacote, decisão aprovada ou issue. -->

- Fonte superior afetada:
- Requisito preservado ou alterado:
- Aprovação da alteração, quando aplicável:

## Escopo

<!-- Liste somente as capacidades alteradas por este PR. -->

## Decisões e alternativas

<!-- Registre decisões não óbvias. Decisão técnica não pode reduzir requisito superior silenciosamente. -->

## Evidências

<!-- Inclua comandos, resultados, screenshots ou artifacts reproduzíveis. Diferencie prova sintética de prova real. Não inclua segredos ou dados pessoais reais. -->

### Qualidade

- [ ] Instalação executada com o método canônico
- [ ] Lint aprovado ou bloqueio explicitamente documentado
- [ ] Typecheck aprovado
- [ ] Testes relevantes aprovados
- [ ] Build de produção concluído
- [ ] Documentação sincronizada com fonte e runtime
- [ ] Nenhuma capacidade sintética foi apresentada como oficial

### Banco e eventos

- [ ] Este PR não altera banco nem eventos
- [ ] Migration aditiva criada e replay validado
- [ ] RLS, índices, constraints e triggers revisados
- [ ] Estado, evento e outbox permanecem atômicos
- [ ] Toda ação nova do usuário possui evento estruturado
- [ ] Schemas de eventos foram versionados e validados

### Dados, privacidade e HubSpot

- [ ] Este PR não cria nova coleta ou inferência de dados
- [ ] Finalidade, classificação, retenção e acesso foram definidos
- [ ] Toda categoria de dado do usuário possui representação HubSpot
- [ ] A matriz HubSpot define objeto/propriedade/evento, frequência e reconciliação
- [ ] Nenhum log técnico, segredo ou binário inseguro é enviado ao HubSpot
- [ ] Dados de teste são sintéticos e marcados
- [ ] Uso em crédito permanece bloqueado quando não validado

### Ambientes e segurança

- [ ] Supabase é usado somente como desenvolvimento/teste
- [ ] A mudança preserva ou comprova portabilidade para AWS
- [ ] Nenhuma dependência de infraestrutura entrou no domínio sem adapter
- [ ] O gate de AWS staging permanece explícito
- [ ] Segredos não foram incluídos
- [ ] Secret scanning relevante foi executado
- [ ] Recursos exclusivos de teste falham fechados em produção

### Interface e acessibilidade

- [ ] Este PR não altera experiência do usuário
- [ ] Desktop e mobile foram verificados
- [ ] Teclado, foco, labels e mensagens de erro foram revisados
- [ ] Conteúdo multimídia considera legenda/transcrição quando aplicável
- [ ] Guia visual e mockups foram usados como referência subordinada

## Riscos e rollback

<!-- Como detectar falha? Como pausar, reverter, reconciliar ou recuperar? -->

## Fora do escopo

<!-- Liste itens deliberadamente adiados sem removê-los do requisito superior. -->
