# Gate de prontidão para produção

## Resultado atual

```text
ready = false
production_deploy_allowed = false
staging_scaffolding = implemented_not_applied
external_blockers = open
accepted_risk = 0
```

Código, migrations, container standalone e Terraform não autorizam operação real. `passed` exige prova no ambiente-alvo; risco aceito exige decisão formal identificável.

## Evidências técnicas concluídas

- RLS interno abrangente e contratos server-only;
- tabelas server-only sem policies e sem grants para `anon` ou `authenticated`;
- redaction e secret scanning;
- cadastro público, confirmação de e-mail e first-touch UTM;
- CPF obrigatório com dígitos verificadores, AES-256-GCM e HMAC independente;
- CPF bruto ausente de metadata, URL, logs e eventos;
- entrada administrativa restrita a e-mail confirmado `@estimulo.org`;
- RBAC administrativo explícito, revogável, temporal e auditável; o domínio não concede permissões sozinho;
- 292 migrations executáveis, incluindo correções append-only;
- testes transacionais de CPF, anúncios, ranking, recompensas, histórico e outline da jornada no Supabase de desenvolvimento;
- administração integral comprovada para jornadas, atividades, trilhas, regras, diagnóstico, pontos, selos, certificados e relatórios;
- idempotência e negativa de permissão comprovadas nos contratos administrativos;
- zero avisos de foreign keys sem índice nas capacidades novas;
- painel com carrossel administrável, retomada, recompensas e ranking pseudonimizado;
- perfil com diagnóstico, histórico, pontos e credenciais;
- trilha com blocos expansíveis e abertura de qualquer atividade liberada pelo backend;
- maturidade em draft, sem atribuição, crédito ou CRM;
- nota de utilidade 1–5 com histórico append-only e exclusão de crédito;
- scanner de malware removido: zero worker, função, tabela, coluna, fila, schedule, cron ou schema de evento ativo;
- arquivos privados validados por autorização, tipo, extensão, tamanho e SHA-256;
- política HubSpot limitada às três classes aprovadas e adapter HTTP desabilitado sem inventário/token;
- harness de navegador E2E real autenticado e read-only implementado;
- build Next.js standalone previamente comprovado, processo não-root e probes live/ready;
- Terraform de staging com guard, imagem por digest, configuração pública no build, secrets por ARN e dados privados/criptografados.

## Evidências ainda não obtidas

- TypeScript e build executados por runner após a administração integral;
- execução do Browser E2E real contra URL implantada com contas reais de teste;
- rotação/revogação da credencial historicamente exposta;
- gestão e rotação institucional das chaves de CPF;
- proteção contra senhas vazadas habilitada no provedor de identidade;
- inventário HubSpot, token, scopes e write/readback em sandbox;
- configuração oficial dos quatro arquétipos;
- conteúdo oficial e mídias da Jornada OpenAI;
- captura e tratamento aprovados de telefone e CNPJ opcional;
- adapters AWS de identidade, RDS e S3;
- conta, região, certificado, domínio e secrets AWS;
- imagem OCI construída e escaneada;
- Terraform validate/plan oficial e apply de staging;
- rollback, backup, PITR e restore em staging;
- WCAG completa com auditoria assistiva;
- workflows do GitHub Actions executando steps no head atual;
- decisões jurídicas e operacionais descritas abaixo.

## Governança externa obrigatória

1. controlador e escopo jurídico;
2. encarregado ou análise formal de dispensa, com canal público;
3. aviso de privacidade e ROPA;
4. bases legais, consentimentos, retenção, exclusão e legal hold;
5. finalidade e tratamento de CPF, telefone, CNPJ e identificadores CRM;
6. contratos, DPAs, subprocessadores e transferências;
7. owners, contatos e exercício de resposta a incidentes;
8. RPO/RTO e exercício de continuidade;
9. governança de crédito, revisão humana, contestação, explicabilidade, equidade e monitoramento;
10. aprovação metodológica, editorial, de acessibilidade e homologação do piloto.

## Regra comportamental e de crédito

Dados educacionais e comportamentais permanecem fora de crédito por padrão. Maturidade, arquétipo, respostas, comentários, ranking e nota de utilidade não podem influenciar elegibilidade, risco ou decisão sem metodologia validada, revisão de vieses, governança humana, base legal e aprovação explícita.

## Regra de deploy

- `main` não recebe merge enquanto checks obrigatórios ou revisões estiverem pendentes;
- produção exige stack separada e aprovação operacional;
- `confirm_deployment=false` é o default do Terraform;
- nenhum apply automático é permitido;
- ausência de prova permanece bloqueio e nunca é convertida em `passed`.
