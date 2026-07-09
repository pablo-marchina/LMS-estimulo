# E12 — Handoff operacional do armazenamento

## Estado atual

- Migration canônica: `20260708001000_m09_storage_lifecycle.sql`.
- Edge Function: `supabase/functions/file-storage`.
- Adapter: `scripts/e12/adapters/supabase-storage-provider.mjs`.
- Bucket de prova: `estimulo-private-test`, privado e vazio.
- Perfil ativo: `e12_storage_proof`, exclusivamente técnico.

## Configuração por ambiente

| Variável | Finalidade | Regra |
|---|---|---|
| `FILE_STORAGE_BUCKET` | bucket físico do adapter | configurar por ambiente; não persistir URL |
| Worker de scan | serviço separado `file-scan-worker` | token de dispatch de uso único; nenhuma chave de worker no storage |
| `SUPABASE_URL` | runtime gerenciado | fornecida pelo ambiente |
| `SUPABASE_SERVICE_ROLE_KEY` | chamadas RPC/Storage server-side | nunca expor ao frontend |

A rota antiga de worker não existe mais no `file-storage`; o processamento assíncrono usa o worker dedicado.

## Sequência do cliente

1. `POST /upload-intents` com JWT válido.
2. Enviar o arquivo usando URL/token retornado.
3. `POST /upload-intents/{id}/confirm`.
4. Exibir status de quarentena; não oferecer download.
5. Após scan e liberação, solicitar `POST /files/{id}/download-intents`.

## Verificações antes de habilitar usuários

- criar perfis reais de upload aprovados;
- confirmar MIME/extensão/tamanho de cada finalidade;
- definir retenção e exclusão;
- provisionar scanner e fila;
- configurar segredo de worker no cofre;
- testar JWT de participante, operador e acesso negado;
- testar arquivo infectado, tipo divergente, tamanho excedido, intent expirado e upload ausente;
- configurar rate limits e limites de custo;
- definir CORS específico do domínio da aplicação antes de produção;
- validar logs sem URL assinada, JWT, conteúdo ou PII desnecessária.

## Não fazer

- não inserir/deletar diretamente em `storage.objects`;
- não persistir URL assinada;
- não usar `service_role` no navegador;
- não associar evidência à submissão antes do estado `clean`;
- não reutilizar object key;
- não considerar extensão do filename como prova de MIME;
- não habilitar o perfil técnico como política final do produto.

## Rollback operacional

- desabilitar criação de intents por perfil;
- manter objetos em `quarantine/`;
- revogar/rotacionar segredo de worker;
- desativar a Edge Function se necessário;
- não apagar metadados antes de reconciliar objetos físicos;
- remover objetos exclusivamente pela API do provedor.
