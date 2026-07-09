# E12 — Validação de runtime do armazenamento

**Data:** 2026-07-08  
**Projeto:** `cfpfeavjlgheqqiaqtzv`  
**Resultado:** aprovado para a camada de teste, com limitações registradas

## 1. Prova transacional do lifecycle

Executada no PostgreSQL real dentro de `BEGIN ... ROLLBACK`, usando dados sintéticos.

| Verificação | Resultado |
|---|---|
| Upload intent criado e confirmado | `confirmed` |
| File object após scan/release | `clean` |
| Chave final | prefixo `protected/` |
| Resultado de scan append-only | 1 registro |
| Descriptor de download | 1 registro autorizado |
| Dados sintéticos persistidos | 0 |

## 2. Testes do adapter local

Executados com Node Test Runner:

- contrato de storage;
- upload assinado;
- SHA-256;
- limite máximo;
- validação de MIME;
- quarentena e release;
- download temporário.

Resultado da suíte E12 atual: **10 aprovados, 0 falhas**; nela, os casos de storage cobrem fluxo completo e rejeições de segurança.

## 3. Prova no Supabase Storage real

| Item | Resultado |
|---|---|
| Bucket | `estimulo-private-test` |
| Público | não |
| Limite | 5 MiB |
| Objeto de prova | 64 bytes |
| Upload assinado | aprovado |
| MIME observado | `text/plain` |
| SHA-256 | `6b7a54f34ea78dd38c7a4c0848756eefaac85798b6a96750dd1e4f9744c3faca` |
| Hash/tamanho conferidos | aprovado |
| `quarantine/ -> protected/` | aprovado |
| Download assinado | conteúdo conferido |
| Remoção final | aprovada |
| Objetos residuais | 0 |

O arquivo JSON da prova preserva os identificadores técnicos necessários para auditoria, sem credenciais ou URL assinada.

## 4. Edge Function segura

Estado final:

- slug `file-storage`;
- versão 3;
- status `ACTIVE`;
- `verify_jwt=true`;
- nenhum token de bootstrap;
- 7 RPCs de storage negadas para `anon` e `authenticated`, permitidas somente para `service_role`;
- segredo de worker ausente por desenho até a etapa de fila;
- `service_role` permanece somente no ambiente server-side gerenciado.

A função temporária utilizada para a prova física foi substituída imediatamente. As extensões PostgreSQL `http` e `pg_net`, habilitadas apenas para acionar a prova dentro do projeto, foram removidas.

## 5. Validação estrutural após M09

| Métrica | Resultado |
|---|---:|
| Tabelas da aplicação | 125 |
| Foreign keys | 222 |
| Check constraints | 52 |
| Índices, incluindo PK/unique | 403 |
| Triggers | 26 |
| Policies | 196 |
| Tabelas com RLS | 52 |
| Tabelas RLS sem policy | 0 |
| FKs sem índice | 0 |
| Security Advisor | 0 alertas |

O Performance Advisor apresenta apenas `unused_index`, esperado antes de carga e tráfego representativos.

## 6. Limitações honestas

Ainda não foi comprovado:

- fluxo completo com JWT de um participante real criado para teste;
- expiração e revogação observadas em tempo real;
- scanner antimalware real;
- concorrência e retry de worker;
- lifecycle de retenção/expurgo;
- paridade no S3 e GuardDuty;
- upload grande/resumível.

Esses itens permanecem gates posteriores; não são tratados como concluídos por inferência.
