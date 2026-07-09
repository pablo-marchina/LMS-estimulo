# E12 — Mapeamento Supabase Storage para AWS

**Versão:** 1.0  
**Status:** contrato definido; prova AWS pendente

## Mapeamento

| Contrato lógico | Teste | AWS staging/produção |
|---|---|---|
| Objeto privado | Supabase private bucket | S3 bucket com Block Public Access |
| Upload assinado | Signed upload token/URL | Presigned PUT ou POST |
| Download temporário | Signed URL curta | Presigned GET curta |
| Identidade do objeto | bucket + object key + version | bucket + key + versionId/ETag |
| Quarentena | `quarantine/` | prefixo `quarantine/` |
| Liberação | move para `protected/` | copy para `protected/` e delete da origem |
| Hash | SHA-256 calculado no servidor | checksum SHA-256 e/ou verificação server-side |
| Scan | resultado normalizado manual/prova | GuardDuty Malware Protection for S3 ou scanner equivalente |
| Evento de scan | chamada de worker | EventBridge -> SQS -> worker |
| Metadados e estados | PostgreSQL | mesmas migrations no RDS PostgreSQL |

## Regras AWS obrigatórias

- S3 Block Public Access em conta e bucket.
- Criptografia at rest; chave gerenciada definida por política institucional.
- IAM mínimo: o serviço de upload não recebe permissão administrativa ampla.
- Presigned URL restrita a uma chave imutável e tempo curto.
- Política explícita de limite de tamanho e content type no serviço; não confiar somente no cliente.
- Versioning avaliado antes de produção.
- Eventos de criação em `quarantine/` encaminhados para scan.
- Resultado do scanner convertido para o enum interno, sem acoplar o domínio ao payload AWS.
- Arquivo não limpo nunca é movido para `protected/`.
- Download somente após autorização da aplicação e estado `clean`.
- Lifecycle rules devem refletir classes de retenção aprovadas, não valores provisórios.

## Normalização de resultados de malware

| Resultado AWS esperado | Estado interno |
|---|---|
| `NO_THREATS_FOUND` | `clean` -> `release_pending` |
| `THREATS_FOUND` | `infected` |
| `UNSUPPORTED` | `manual_review` |
| `ACCESS_DENIED` | `manual_review` + incidente operacional |
| `FAILED` | `manual_review` + retry/alerta |

## Prova obrigatória no staging

1. Aplicar M00–M09 no RDS vazio.
2. Criar bucket por IaC.
3. Emitir presigned upload para uma chave de quarentena.
4. Fazer upload, validar metadata e checksum.
5. Receber evento via EventBridge/SQS.
6. Registrar scan no PostgreSQL.
7. Promover arquivo limpo.
8. Emitir presigned download e conferir conteúdo.
9. Repetir com arquivo rejeitado, retry e DLQ.
10. Comparar o mesmo conjunto de testes de contrato com o adapter Supabase.

## Decisão de portabilidade

A Edge Function é uma implementação de teste, não uma dependência de domínio. Em AWS, a mesma API poderá rodar em Lambda/API Gateway ou serviço containerizado, desde que preserve o contrato HTTP e as RPCs PostgreSQL. Nenhuma URL do Supabase é persistida no modelo.
