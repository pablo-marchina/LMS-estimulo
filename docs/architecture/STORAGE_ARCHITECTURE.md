# Arquitetura de armazenamento de arquivos

**Versão:** 1.0  
**Data:** 2026-07-08  
**Status:** implementada e comprovada no Supabase de teste; paridade AWS pendente

## Objetivo

Permitir upload e download de arquivos privados sem transformar o banco em depósito de binários, sem expor credenciais privilegiadas ao navegador e sem acoplar o domínio ao Supabase Storage. O mesmo contrato deverá ser implementado por S3 em staging e produção.

## Invariantes

1. O binário é manipulado exclusivamente pela API do provedor de objetos.
2. PostgreSQL mantém metadados governados, autorização, lifecycle, hash e evidência do scan.
3. Nenhum arquivo enviado por participante nasce liberado: a chave inicial usa `quarantine/`.
4. URLs assinadas são efêmeras e nunca são persistidas como identidade do arquivo.
5. A identidade persistida é `storage_provider + bucket + object_key`, complementada por versão/ETag quando disponíveis.
6. A confirmação é server-side: MIME, tamanho e SHA-256 são derivados do objeto efetivamente armazenado.
7. Apenas um resultado `clean` promove o arquivo para `protected/` e permite download.
8. Resultados de scan são append-only.
9. O navegador não recebe `service_role` nem acesso SQL aos schemas internos.
10. Regras de produto são perfis versionáveis; o perfil `e12_storage_proof` existe somente para prova técnica.

## Componentes

### `core.file_upload_profiles`

Política lógica de upload independente do provedor:

- MIME permitidos;
- extensões permitidas;
- limite máximo;
- classe de retenção;
- necessidade de scanner;
- estado ativo/desabilitado.

### `core.file_upload_intents`

Autorização curta e de uso único para uma chave imutável. Registra solicitante, organização, perfil, objeto esperado, expiração e resultado da confirmação.

Estados:

```text
pending_upload -> confirmed
pending_upload -> aborted | expired | rejected
```

### `core.file_objects`

Registro governado do arquivo confirmado. Guarda provedor, bucket, chave, MIME, tamanho, SHA-256, versão física, ETag, lifecycle de segurança e retenção.

Estados principais:

```text
quarantined -> release_pending -> clean
quarantined -> infected
quarantined -> manual_review
clean -> deleted
```

### `core.file_security_scans`

Histórico append-only normalizado do scanner. Não conserva payload arbitrário do provedor como fonte decisória; registra status, ameaças, razões, versão do scanner e referência externa.

### Edge Function `file-storage`

Fronteira HTTP autenticada, atualmente na versão 3 e com `verify_jwt=true`.

Rotas:

| Rota | Função |
|---|---|
| `POST /upload-intents` | Autoriza e emite upload assinado para chave em quarentena. |
| `POST /upload-intents/{id}/confirm` | Inspeciona objeto, baixa bytes no servidor, calcula SHA-256 e confirma metadados. |
| `POST /files/{id}/download-intents` | Emite download assinado somente para arquivo `clean` e autorizado. |
| `POST /worker/files/{id}/scan-results` | Normaliza scan, promove arquivo limpo e conclui o release. |

A rota de scan foi removida do serviço de storage. O scan é executado exclusivamente pelo `file-scan-worker`, ativado por token de dispatch de uso único.

### `SupabaseStorageProvider`

Adapter local que implementa o contrato `ObjectStorageProvider`:

- criação/verificação de bucket privado;
- upload assinado;
- upload por token;
- leitura de metadados;
- SHA-256;
- validação de limite e MIME;
- movimentação de quarentena;
- download assinado;
- remoção.

## Fluxo ponta a ponta

```text
Cliente autenticado
  -> Edge Function valida JWT e e-mail verificado
  -> RPC cria file_upload_intent
  -> Storage emite URL/token assinado
  -> Cliente envia bytes direto ao provedor
  -> Cliente solicita confirmação
  -> Edge Function lê metadata + bytes
  -> valida MIME/tamanho + calcula SHA-256
  -> RPC cria file_object em quarantined
  -> fila envia trabalho de scan
  -> scanner retorna resultado normalizado
  -> clean: move quarantine/ para protected/
  -> RPC conclui file_object como clean
  -> download autorizado recebe URL assinada curta
```

## Autorização

- A identidade externa é resolvida por `issuer + subject` para `iam.user_accounts`.
- Upload próprio exige empreendedor ativo vinculado a uma jornada da organização, ou permissão `file.manage`.
- Confirmação exige o mesmo solicitante ou operador autorizado.
- Download exige acesso ao `file_object` e estado `clean`.
- As RPCs públicas revogam `anon/authenticated`; somente a função server-side com `service_role` pode executá-las.
- Tabelas internas mantêm RLS para runtime/worker e defesa em profundidade.

## Portabilidade

O domínio não conhece SDK, URL ou semântica proprietária. O adapter AWS deverá preservar:

- chave imutável;
- prefixos `quarantine/` e `protected/`;
- upload/download assinados;
- leitura de tamanho/MIME/versão/ETag;
- cálculo/verificação de checksum;
- move lógico, que no S3 pode ser `CopyObject + DeleteObject`;
- exclusão idempotente;
- mesmos estados e RPCs PostgreSQL.

## Fora do escopo concluído

- perfis reais para evidência prática, conteúdo editorial e certificados;
- scanner real no Supabase;
- fila e worker de scan;
- lifecycle/expurgo automático;
- teste E2E com sessão real de participante;
- prova S3/GuardDuty no AWS staging.
