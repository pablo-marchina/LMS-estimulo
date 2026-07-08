# Constraints e integridade

**Versão:** 0.1

## 1. Princípios

1. Integridade estrutural deve ser aplicada no banco sempre que possível.
2. Regras de domínio que cruzam agregados são aplicadas por serviços transacionais e testadas.
3. Eventos e outbox são gravados na mesma transação do estado.
4. Tabelas históricas não sofrem update/delete comum.
5. FKs não devem usar `ON DELETE CASCADE` sobre fatos históricos, certificados, eventos, ledgers ou resultados analíticos.
6. Exclusão por LGPD usa anonimização, tombstone ou processo controlado, não cascata indiscriminada.

## 2. Invariantes essenciais

### Identidade

- `(auth_provider, auth_subject)` é único.
- uma conta pode se associar a no máximo um `entrepreneur` ativo;
- uma empresa pode ter múltiplos empreendedores;
- vínculo pessoa–negócio possui período e verificação;
- IDs externos nunca substituem UUIDs internos.

### Publicação e versões

- `version_number > 0` e único por definição;
- `content_hash` identifica conteúdo equivalente;
- versões publicadas não podem ter estrutura editada;
- transição permitida: draft → review → published → retired;
- retirada de publicação não apaga versões nem participações.

A imutabilidade publicada será protegida por trigger/função específica na migration de implementação. O DDL preliminar registra a estrutura, mas não tenta adivinhar todas as colunas permitidas em uma aposentadoria.

### Jornada

- inscrição aponta para versão publicada;
- uma inscrição possui no máximo uma instância principal;
- cada passo de uma atribuição existe uma única vez;
- transições referenciam passos da mesma trilha;
- `aggregate_version` cresce monotonamente por agregado;
- conclusão crítica somente é escrita pelo backend.

### Diagnóstico

- respostas são append-only e possuem `revision` crescente;
- resultado guarda a versão do cálculo;
- escore só existe com evidência mínima;
- segmentos possuem validade e origem;
- arquétipo pode ser nulo/incerto e não é obrigatório.

### Avaliação e prática

- tentativa é única por `(step_instance_id, attempt_number)`;
- resultado referencia uma versão de scoring;
- respostas pertencem à mesma versão da avaliação da tentativa;
- submissão não pode ser alterada após entrar em revisão;
- arquivos precisam estar verificados antes de associação final;
- revisão registra rubrica, revisor e evento causal.

### Gamificação

- `point_ledger.amount <> 0`;
- `idempotency_key` impede duplicidade;
- reversão referencia lançamento anterior e deve usar valor compensatório;
- saldo é projeção;
- selo/certificado é único por contexto e versão;
- revogação não apaga emissão.

### Eventos

- `event_id` é único;
- `(aggregate_type, aggregate_id, aggregate_version)` é único quando presente;
- schema e versão precisam existir;
- payload deve validar contra JSON Schema antes do commit/distribuição;
- `received_at` é referência operacional;
- fatos críticos não são aceitos do navegador.

### Integrações

- job possui chave de idempotência;
- segredo não é armazenado na tabela de conexão;
- mapeamentos são versionados;
- conflito não é resolvido por overwrite silencioso;
- webhook exige validação de assinatura, timestamp e replay.

### Features e score

- exatamente um campo de valor é preenchido em `feature_values`;
- cada valor referencia versão e run;
- score guarda hash do snapshot de input;
- score sem validação não pode receber aprovação de uso produtivo;
- usos permitidos/proibidos ficam na definição e na aprovação.

## 3. JSONB

JSONB será aceito para:

- configuração versionada;
- regras estruturadas;
- snapshots imutáveis;
- respostas heterogêneas;
- detalhes de erros sanitizados;
- metadados de integração.

Não será usado para ocultar:

- relacionamentos principais;
- estados;
- versões;
- eventos;
- tentativas;
- valores de features;
- IDs externos.

Todo JSONB executável terá JSON Schema e versão.

## 4. Concorrência

Agregados mutáveis possuem `aggregate_version` ou `lock_version`. Updates usarão optimistic concurrency:

```sql
update ...
set ..., aggregate_version = aggregate_version + 1
where id = :id and aggregate_version = :expected_version;
```

Zero linhas atualizadas indica conflito, não sucesso.

## 5. Deletes

| Tipo | Política |
|---|---|
| Rascunho sem uso | exclusão controlada possível |
| Versão publicada | nunca apagar; aposentar |
| Participação | encerrar/cancelar |
| Evento/ledger/auditoria | append-only |
| PII | anonimizar ou separar vínculo conforme processo de privacidade |
| Arquivo | tombstone + exclusão física após retenção |
| Projeção | pode ser reconstruída |

## 6. Testes obrigatórios de integridade

- migrations aplicam do zero;
- migrations atualizam um snapshot anterior;
- tentativa duplicada de evento é rejeitada;
- ponto duplicado é rejeitado;
- versão publicada não é editável;
- participante não é migrado silenciosamente;
- replay não duplica efeito externo;
- RLS impede leitura cruzada;
- exclusão de projeção permite reconstrução;
- falha de outbox não perde evento.
