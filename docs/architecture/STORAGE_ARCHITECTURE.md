# Contrato lógico de armazenamento de arquivos

**Revisado em:** 2026-07-30  
**Estado:** adapter Supabase de teste ativo; provider e operação de produção pendentes

## Objetivo

Permitir upload e download de arquivos privados sem transformar o banco em depósito de binários, sem expor credenciais privilegiadas ao navegador e sem acoplar o domínio ao SDK do provider.

Este documento não escolhe o serviço de objetos da produção AWS, o mecanismo de upload, scanner, lifecycle ou distribuição. Essas decisões exigem ADR próprio.

## Estado atual

No ambiente de desenvolvimento, teste e preview:

- bytes são armazenados pelo adapter Supabase autorizado;
- operações passam por rotas e módulos server-only;
- PostgreSQL preserva metadados, vínculo de domínio, autorização e auditoria;
- uploads de credenciais externas, materiais e evidências usam contratos específicos;
- URLs ou tokens de acesso são efêmeros e não constituem identidade persistente;
- o navegador não recebe `service_role` nem acesso direto aos schemas internos.

O runtime versionado não contém Edge Function `file-storage`, worker de scan, scheduler de scan ou pipeline de quarentena aprovado. Nenhuma documentação ou teste pode apresentá-los como ativos.

## Identidade persistente

A identidade lógica de um arquivo deve separar:

- identificador interno estável;
- organização e proprietário lógico;
- finalidade e vínculo com o domínio;
- provider e localização física abstrata;
- nome original e tipo declarado;
- tamanho e checksum quando calculados;
- estado, retenção e timestamps;
- referências a uploads, revisões ou credenciais relacionadas.

URLs assinadas, cookies, tokens e paths temporários nunca são a identidade do arquivo.

## Fluxo do ambiente de teste

```text
usuário autenticado
→ autorização server-side
→ validação de finalidade, tamanho e tipo
→ upload pelo adapter de teste
→ confirmação e metadados PostgreSQL
→ vínculo com a entidade de domínio
→ download autorizado por prazo curto
```

A confirmação deve ser idempotente. Repetição não pode criar dois arquivos lógicos nem dois vínculos para a mesma operação.

## Autorização

- toda operação resolve identidade externa para conta interna;
- acesso é limitado por organização, proprietário e capacidades RBAC;
- upload e confirmação exigem finalidade permitida;
- download exige acesso ao objeto e ao vínculo de domínio;
- remoção ou arquivamento respeita dependências e retenção;
- funções privilegiadas não são executáveis por `anon` ou diretamente pelo navegador;
- logs não contêm bytes, URL assinada, token ou dado pessoal desnecessário.

## Validação de arquivos

Controles atualmente esperados no software:

- limite de tamanho;
- lista de tipos e extensões conforme o caso de uso;
- nome e metadados normalizados;
- checksum quando disponível no fluxo;
- confirmação server-side;
- idempotência;
- autorização de upload e download;
- tratamento explícito de falha e limpeza do upload não persistido.

**Verificação antimalware não está implementada no runtime atual.** Produção não pode afirmar inspeção, quarentena ou liberação por scanner até que arquitetura, provider, política, operação e testes tenham sido aprovados.

## Fronteira portável

O domínio deve conhecer somente operações equivalentes a:

- criar intenção ou autorização curta;
- enviar bytes;
- confirmar metadados;
- consultar objeto;
- emitir acesso temporário;
- arquivar ou remover de forma idempotente;
- aplicar retenção e legal hold;
- reconciliar objeto físico e registro lógico.

SDK, bucket, chave física, versionamento, checksum nativo, criptografia, upload multipart e lifecycle permanecem dentro do adapter escolhido.

## Requisitos do futuro provider AWS

A decisão arquitetural deve definir, sem ser inferida deste documento:

- serviço e topologia de armazenamento;
- upload direto ou mediado;
- criptografia e gestão de chaves;
- versionamento, retenção e exclusão;
- verificação de conteúdo e resposta a ameaça;
- URLs temporárias e proteção contra replay;
- limites, custos e lifecycle;
- observabilidade, auditoria e reconciliação;
- backup, restore e disaster recovery;
- migração do adapter de teste.

## Gate B

Antes de produção, o ambiente aprovado deve comprovar:

1. upload e confirmação idempotentes;
2. autorização positiva e negativa entre usuários e organizações;
3. download temporário sem vazamento;
4. arquivos incompletos ou órfãos reconciliados;
5. retenção, exclusão e legal hold;
6. falha e recuperação do provider;
7. capacidade com arquivos representativos;
8. observabilidade e alertas;
9. controles de segurança definidos pela análise de risco;
10. rollback e recuperação exercitados.

Até essa prova, operações de produção permanecem bloqueadas e fail-closed.
