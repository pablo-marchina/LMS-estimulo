# Contrato de integração com a AWS corporativa

**Estado:** informações institucionais pendentes; nenhum recurso deve ser aplicado sem este inventário

Este documento define as informações mínimas necessárias para conectar a Plataforma Estímulo à estrutura AWS existente sem duplicar redes, segurança, identidade, observabilidade ou pipelines.

## Informações obrigatórias

### Organização e ambientes

- IDs das contas de desenvolvimento, staging e produção;
- AWS Organizations/OU e políticas SCP aplicáveis;
- região principal e regiões permitidas;
- convenções de nomes, tags, custos e ownership;
- processo de aprovação e janela de mudança.

### Rede e entrada

- VPC e CIDRs aprovados;
- subnets privadas disponíveis para Lambda e dados;
- NAT, endpoints privados e regras de egress;
- hosted zone e domínio;
- CloudFront, WAF, API Gateway, ALB ou gateway corporativo já existentes;
- certificados ACM e política TLS;
- limites de rate, burst e proteção contra abuso.

### Identidade

- existência de Cognito User Pool corporativo;
- IdP OIDC/SAML corporativo e metadados;
- configuração Google Workspace para administradores;
- política de MFA, senha, recuperação e linking;
- domínios, callbacks e logout URLs permitidos;
- processo para usuários existentes e migração de identidade.

### Dados

- cluster/instância RDS PostgreSQL existente ou padrão corporativo;
- versão do PostgreSQL e extensões permitidas;
- RDS Proxy existente ou padrão de pooling;
- database/subnet/security groups;
- usuário de migration, usuário de aplicação e política de rotação;
- backup, PITR, retenção, RTO e RPO;
- ferramentas aprovadas para migrations e acesso emergencial.

### Arquivos

- buckets S3 existentes ou política de criação;
- KMS keys e políticas;
- CORS aprovado;
- versionamento, retenção e lifecycle;
- acesso por VPC endpoint;
- política de URLs pré-assinadas e checksums;
- requisitos de classificação, DLP ou validação de conteúdo.

### Processamento assíncrono

- filas SQS, DLQs e EventBridge existentes;
- convenções de retry, visibility timeout e redrive;
- limites de concorrência por integração;
- padrão corporativo de idempotência e reconciliação;
- conectividade e egress para HubSpot.

### Secrets e criptografia

- Secrets Manager, Parameter Store ou solução corporativa equivalente;
- KMS keys, grants e rotação;
- mecanismo de injeção na Lambda;
- processo break-glass e auditoria;
- política para chaves de proteção de CPF.

### Observabilidade e operação

- CloudWatch log groups e retenção;
- tracing/ADOT ou plataforma corporativa equivalente;
- dashboards, alarmes e canal de incidentes;
- SLOs de disponibilidade e latência;
- on-call, runbooks e escalonamento;
- ferramenta de SIEM e retenção de auditoria.

### Entrega

- ECR corporativo e política de scanning;
- pipeline existente e mecanismo OIDC/deploy role;
- política de assinatura, SBOM e provenance;
- estratégia de Lambda versions/aliases e canary;
- aprovação de migrations antes do tráfego;
- rollback de aplicação e banco.

## Saída esperada do inventário

O inventário deve produzir um mapa sem segredos:

```text
capacidade
→ recurso corporativo escolhido
→ conta/região
→ owner
→ contrato de acesso
→ configuração necessária no LMS
→ evidência de staging
→ procedimento de rollback
```

Valores secretos, tokens, senhas, cookies, chaves privadas e payloads reais não pertencem a este documento.

## Regra de implementação

A árvore ativa contém somente o contrato e o container Lambda; não contém uma stack genérica de infraestrutura.

Até o inventário ser concluído:

- não criar VPC, Cognito, RDS, buckets, filas, WAF ou observabilidade paralelos;
- não adicionar IaC que presuma contas, redes ou padrões ainda desconhecidos;
- não declarar a plataforma pronta para staging;
- implementar apenas contratos, adapters e testes que não dependam de identificadores corporativos;
- manter Supabase restrito a desenvolvimento e validação temporária;
- usar os módulos e pipelines oficiais da empresa quando a implementação física for iniciada.
