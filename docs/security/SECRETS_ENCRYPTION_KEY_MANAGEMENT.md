# Segredos, criptografia e gestão de chaves

## Modelo

O banco contém somente inventário de metadados: código, ambiente, provedor, referência, finalidade, owner, política de rotação e datas. Valores nunca devem entrar no repositório, tabelas de aplicação, logs ou tickets.

## Supabase de testes

- chaves privilegiadas ficam no ambiente gerenciado das Edge Functions;
- URL e chave publicável do scheduler ficam no Vault;
- a chave publicável não autoriza consumo: o worker exige token aleatório de uso único;
- comprometimento exige rotação e revisão de logs/tokens.

## AWS de produção

- Secrets Manager para credenciais rotacionáveis;
- KMS customer-managed keys para controle de política, auditoria e separação de funções;
- IAM roles temporárias no lugar de chaves estáticas quando possível;
- chaves distintas por ambiente e propósito;
- acesso de break-glass separado, monitorado e expirável;
- rotação testada e rollback documentado.

## Gate

Continuam bloqueados: política KMS, rotação operacional, revisão de IAM e prova de TLS. Esses controles só podem mudar para `passed` com evidência do ambiente AWS real.
