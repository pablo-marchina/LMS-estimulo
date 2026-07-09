## Objetivo

<!-- Qual problema este PR resolve? -->

## Escopo

<!-- Liste somente as capacidades alteradas por este PR. -->

## Decisões e alternativas

<!-- Registre decisões não óbvias e por que alternativas foram descartadas. -->

## Evidências

<!-- Inclua comandos, resultados, screenshots ou artefatos reproduzíveis. Não inclua segredos ou dados pessoais reais. -->

### Qualidade

- [ ] Instalação executada com o método canônico do repositório
- [ ] Lint aprovado ou bloqueio explicitamente documentado
- [ ] Typecheck aprovado
- [ ] Testes relevantes aprovados
- [ ] Build de produção concluído
- [ ] Documentação sincronizada com o runtime

### Banco e eventos

- [ ] Este PR não altera banco nem eventos
- [ ] Migration aditiva criada e replay validado
- [ ] RLS, índices, constraints e triggers revisados
- [ ] Estado, evento e outbox permanecem atômicos
- [ ] Schemas de eventos foram versionados e validados

### Dados, LGPD e HubSpot

- [ ] Este PR não cria nova coleta ou inferência de dados
- [ ] Finalidade, classificação, retenção e acesso foram definidos
- [ ] Dados de usuário possuem decisão de projeção no HubSpot
- [ ] Nenhum log técnico ou segredo é enviado ao HubSpot
- [ ] Dados de teste são sintéticos

### Ambientes

- [ ] Supabase é usado somente como desenvolvimento/teste
- [ ] A mudança preserva portabilidade para AWS
- [ ] Nenhuma dependência de Supabase/AWS entrou no domínio
- [ ] O gate de AWS staging permanece explícito

## Riscos e rollback

<!-- Como detectar falha? Como interromper, reverter ou recuperar? -->

## Fora do escopo

<!-- Liste itens deliberadamente adiados para evitar expansão silenciosa. -->
