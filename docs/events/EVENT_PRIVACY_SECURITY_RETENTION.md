# Privacidade, segurança e retenção dos eventos

**Versão:** 0.1  
**Status:** Arquitetura definida; prazos institucionais de retenção ainda pendentes

## 1. Regra de minimização

Eventos devem conter apenas dados necessários ao fato e aos consumidores declarados.

Proibido por padrão:

- nome, e-mail, telefone, CPF ou CNPJ;
- endereço;
- tokens e credenciais;
- texto livre de diagnóstico;
- conteúdo de arquivos ou prompts reais;
- URLs completas com parâmetros;
- IP e user-agent no event store comportamental;
- dados financeiros detalhados quando uma referência controlada for suficiente.

## 2. Classes

| Classe | Uso |
|---|---|
| `internal` | metadados técnicos sem identificação de participante |
| `pseudonymous` | IDs opacos ligados indiretamente a pessoa/negócio |
| `restricted` | respostas, avaliações, submissões, segurança ou contexto de crédito |

`restricted` exige política de acesso, finalidade, auditoria e retenção específica.

## 3. Separação de identidade

O event store usa UUIDs internos. A resolução para identidade direta ocorre somente pelo domínio de identidade, sob autorização. Exportações de pesquisa devem substituir IDs e limitar granularidade temporal quando necessário.

## 4. Conteúdo e arquivos

- eventos armazenam apenas `asset_id`, tipo, tamanho, hash e status de varredura quando necessário;
- arquivos permanecem em object storage com controles próprios;
- texto de submissão não é duplicado no evento;
- erros e dead letters não podem copiar payloads sensíveis para logs.

## 5. Retenção

O catálogo atribui classes lógicas:

- `security_short`;
- `integration_short`;
- `operational`;
- `research_controlled`;
- `credential_history`.

As durações exatas ainda dependem da política institucional e das finalidades legais. O deploy de produção exige aprovação desses prazos, mas o schema já deve permitir política por tipo, organização e finalidade.

## 6. Direitos e exclusão

A arquitetura deverá suportar:

- localização dos eventos relacionados a um titular por mapa seguro;
- exportação compreensível;
- desassociação/pseudonimização;
- redaction controlada de campos permitidos;
- invalidação e recomputação de features derivadas;
- preservação de trilha de auditoria sem manter conteúdo desnecessário.

A ação específica depende da base e obrigação aplicáveis; o software não deve assumir que retirada de consentimento equivale automaticamente à eliminação de todo registro.

## 7. Segurança

- validar tamanho, tipo e profundidade do payload;
- assinar/verificar mensagens quando atravessarem trust boundaries relevantes;
- restringir publicação de eventos a identidades de serviço;
- criptografar em trânsito e repouso;
- aplicar RLS/ACLs por classe e organização;
- impedir que `traceparent`, `subject` e extensões carreguem dados sensíveis;
- auditar replay, redaction, exportação e acesso administrativo.

## 8. Informações ainda necessárias

Antes do gate de produção, a Estímulo deverá fornecer ou aprovar:

- prazos de retenção por finalidade;
- responsáveis por acesso a eventos restritos;
- política de exportação/pesquisa;
- tratamento de dados da operação de crédito;
- requisitos específicos do HubSpot e contratos com operadores.
