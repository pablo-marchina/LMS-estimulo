# Logging, redaction e auditoria

## Controle implementado

`governance.redact_jsonb` percorre objetos e arrays e substitui valores de chaves associadas a senha, segredo, API key, tokens, autorização, cookies, URLs assinadas, chaves privadas e credenciais.

A redaction é aplicada antes da persistência em:

- audit log;
- eventos e jobs;
- erros, attempts e dead letters;
- scheduler e alertas;
- eventos de privacidade e incidentes;
- detalhes de retenção;
- limitações do ROPA.

Para eventos e jobs, o hash SHA-256 é calculado depois da redaction, preservando integridade entre `payload` e `payload_hash`.

## O que o controle não faz

- não detecta todo PII em texto livre;
- não substitui schema, allowlist e minimização;
- não torna seguro registrar documentos, prompts ou respostas completas;
- não impede que um nome de chave incomum carregue segredo;
- não anonimiza identificadores necessários à auditoria.

## Regras operacionais

- logs de aplicação devem ser estruturados;
- proibir body completo por padrão;
- usar IDs de correlação, não conteúdo do usuário;
- separar audit log de debug log;
- limitar acesso e retenção;
- alertar sobre leitura/exportação administrativa;
- na AWS, usar CloudTrail/CloudWatch e validação de integridade de logs;
- revisar amostras de logs em staging antes da produção.

## Prova

A suíte transacional confirmou redaction recursiva em payloads, eventos de solicitações, consentimento e incidentes, sem persistir os valores de prova.
