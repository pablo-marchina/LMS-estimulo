# RLS, privilégios e segurança do banco

**Versão:** 0.1

## 1. Decisão

Tabelas internas não serão expostas amplamente ao navegador. A preferência é:

```text
Browser
→ API/casos de uso
→ transação autorizada
→ banco interno
```

Caso o provedor escolhido exponha PostgreSQL via API automática, RLS permanece defesa obrigatória, não substituto da autorização de domínio.

## 2. Perfis de acesso

- **migration_owner:** somente pipeline de migrations;
- **application_runtime:** CRUD mínimo para casos de uso;
- **worker_runtime:** outbox, inbox, integrações e projeções;
- **analytics_runtime:** leitura pseudonimizada e escrita de features;
- **support_readonly:** views autorizadas;
- **auditor_readonly:** acesso controlado a auditoria;
- **participant:** acesso indireto ou RLS ao próprio escopo;
- **anonymous:** somente catálogo público publicado e validação mínima de certificado.

Nenhum frontend recebe credencial de owner/service irrestrita.

## 3. Políticas de participante

Um participante pode acessar apenas:

- seu perfil permitido;
- negócios onde possui vínculo válido;
- suas inscrições e instâncias;
- conteúdos publicados e liberados para sua jornada;
- suas respostas, tentativas, submissões e certificados;
- projeções curadas de progresso/pontos.

Não pode consultar:

- eventos brutos;
- features internas;
- score;
- dados de outros participantes;
- payloads de integração;
- auditoria;
- gabaritos antes da política permitida.

## 4. Políticas administrativas

Capacidade depende de:

- membership ativo;
- permissão;
- organização proprietária;
- recurso;
- estado do recurso;
- escopo da operação.

“Admin” global não será uma policy universal.

## 5. Schemas restritos

Acesso direto do cliente é proibido a:

- `eventing`;
- `integration`;
- `intelligence`;
- `governance`;
- respostas corretas de avaliação;
- arquivos privados.

## 6. PII

- e-mail e telefone ficam no cadastro, não nos eventos;
- CPF/CNPJ, quando necessários, devem ser protegidos, minimizados e ter hash separado para matching;
- segredos ficam em secret manager;
- logs não contêm tokens, payloads integrais ou respostas sensíveis;
- uploads usam URLs assinadas curtas e buckets privados.

## 7. Auditoria

Registrar ações administrativas como:

- publicar/aposentar versão;
- alterar regra;
- revisar prática;
- emitir/revogar credencial;
- reprocessar evento;
- resolver conflito;
- acessar dado restrito;
- aprovar modelo.

## 8. Validação necessária

O helper `iam.current_user_account_id()` do DDL é um adapter neutro. Ele deverá ser substituído ou integrado ao mecanismo real de claims do provedor escolhido antes de qualquer migration produtiva.
