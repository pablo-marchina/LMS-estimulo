# Modelo inicial de autorização e permissões

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** Proposta técnica; papéis finais dependem da operação  
**Escopo:** E05-T04

## 1. Objetivo

Definir autorização por capacidade, escopo e finalidade. Os papéis abaixo são conjuntos iniciais de capacidades, não permissões codificadas diretamente nas telas.

## 2. Princípios

1. Autenticação não implica autorização.
2. Toda ação sensível é verificada no servidor.
3. RLS ou controle equivalente protege os dados no banco.
4. Papéis globais devem ser evitados quando a permissão depende de organização, jornada, negócio ou atribuição.
5. Acesso analítico a dados comportamentais não implica acesso à identidade pessoal.
6. Conteúdo e dados de participantes possuem políticas distintas.
7. Integrações e workers utilizam identidades de serviço com menor privilégio.
8. A interface pode ocultar ações, mas o backend deve negar acessos inválidos.
9. Exportação, reprocessamento, publicação e alteração de regra exigem auditoria.
10. Parceiros não recebem acesso implícito a participantes apenas por fornecerem conteúdo.

## 3. Dimensões da autorização

Uma decisão de acesso deve considerar:

- **sujeito:** usuário ou serviço;
- **capacidade:** ação solicitada;
- **recurso:** entidade alvo;
- **escopo:** organização, jornada, coorte, negócio ou atribuição;
- **estado:** rascunho, publicado, enviado, concluído etc.;
- **finalidade:** operação, suporte, pesquisa, auditoria;
- **sensibilidade:** pessoal, comportamental, crédito, conteúdo;
- **tempo:** vigência do vínculo e da autorização.

## 4. Papéis candidatos

### Participant / Entrepreneur

- acessar e corrigir dados próprios permitidos;
- visualizar negócios aos quais possui vínculo autorizado;
- realizar diagnóstico próprio;
- executar participações atribuídas;
- enviar respostas e evidências próprias;
- visualizar progressão, pontos, selos e certificados próprios;
- gerenciar preferências e solicitações de privacidade.

### Platform Administrator

- gerir configuração geral;
- atribuir papéis;
- operar incidentes e ações excepcionais;
- não recebe automaticamente acesso irrestrito ao conteúdo pessoal das submissões sem finalidade.

### Content Editor

- criar e editar rascunhos de cursos, atividades e ativos;
- não publicar sozinho quando houver separação de funções;
- não acessar dados individuais de participantes.

### Content Publisher / Journey Manager

- revisar e publicar versões;
- configurar trilhas e regras;
- retirar versões para novas entradas;
- visualizar métricas agregadas autorizadas.

### Reviewer / Mentor

- visualizar somente submissões atribuídas;
- revisar usando rubrica aplicável;
- enviar feedback;
- não acessar score ou dados de crédito sem capacidade adicional.

### Operations Analyst

- acompanhar participação e falhas operacionais;
- realizar atribuições manuais autorizadas;
- pausar, reativar ou corrigir estados por casos de uso auditados;
- consultar dados necessários à operação.

### Support Agent

- consultar estado mínimo para atendimento;
- reenviar convite ou iniciar recuperação;
- não visualizar respostas sensíveis, score ou dados completos de crédito.

### Data / Research Analyst

- acessar datasets pseudonimizados aprovados;
- executar análise e validação;
- não reidentificar participantes;
- não alterar estado operacional.

### Risk Researcher

- analisar associação entre features experimentais e desfechos de crédito em ambiente autorizado;
- acesso sujeito a segregação, finalidade e revisão;
- não utiliza score experimental para decisão produtiva na release inicial.

### Privacy / Compliance

- consultar registros de consentimento, retenção, auditoria e solicitações de titulares;
- autorizar ou acompanhar exportações/exclusões;
- acesso a conteúdo somente quando necessário à finalidade.

### Auditor

- acesso somente leitura a logs, versões, decisões e evidências autorizadas;
- não altera dados de negócio.

### Partner Contributor

- criar conteúdo no escopo da organização parceira;
- visualizar somente materiais próprios e feedback editorial;
- sem acesso automático a participantes.

### Integration Service

- ler projeções explicitamente autorizadas;
- criar comandos e registrar resultados de sincronização;
- não acessar tabelas além do contrato.

### Background Worker

- executar tarefas específicas com credencial separada por função;
- sem papel administrativo amplo.

## 5. Matriz de capacidades

Legenda: `O` próprio, `A` atribuído/escopo autorizado, `G` global limitado, `—` negado por padrão.

| Capacidade | Participante | Editor | Publisher/Journey | Reviewer | Operações | Suporte | Dados | Privacidade | Admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Ler perfil pessoal | O | — | — | — | A | A mínimo | pseudônimo | A | A excepcional |
| Editar perfil pessoal | O limitado | — | — | — | A limitado | — | — | A corretivo | A excepcional |
| Criar conteúdo rascunho | — | A | A | — | — | — | — | — | G |
| Editar conteúdo rascunho | — | A | A | — | — | — | — | — | G |
| Publicar versão | — | — | A | — | — | — | — | — | G |
| Atribuir jornada/trilha | — | — | A por regra | — | A | — | — | — | G |
| Executar atividade | O | — | — | — | — | — | — | — | — |
| Ver submissão prática | O | — | — | A atribuída | A operacional | mínimo | pseudônimo se aprovado | A por finalidade | excepcional |
| Revisar submissão | — | — | — | A | A excepcional | — | — | — | G |
| Consultar eventos brutos | próprios selecionados | — | agregados | relacionados à revisão | A operacional | — | A pseudonimizado | A | excepcional |
| Ver features experimentais | explicação própria futura | — | agregados | — | somente se aprovado | — | A | A governança | excepcional |
| Ver score experimental | não na release inicial | — | — | — | — | — | A | A governança | excepcional |
| Reprocessar integração | — | — | — | — | A | — | — | auditoria | G |
| Exportar dados | próprios | — | agregados | — | autorizado | — | A aprovado | A | excepcional |
| Gerir papéis | — | — | — | — | — | — | — | revisão | G |
| Revogar certificado | — | — | A por política | — | A excepcional | — | — | auditoria | G |

## 6. Políticas por recurso

### Jornada e conteúdo

- rascunho: visível apenas a capacidades editoriais no escopo da organização;
- publicado: visível ao participante somente quando referenciado por participação válida;
- retirado: histórico permanece acessível a quem já o recebeu, conforme política;
- ativo privado não pode ser acessado por URL previsível sem autorização.

### Participação

Participante acessa apenas participações próprias. Operação acessa conforme programa/coorte. Parceiro não acessa participação sem autorização específica.

### Diagnóstico

- respostas individuais: participante e funções autorizadas pela finalidade;
- editor de diagnóstico não recebe automaticamente respostas;
- resultados usados para personalização devem ser explicáveis e auditáveis;
- dados de pesquisa preferencialmente pseudonimizados.

### Submissões práticas

- participante acessa as próprias;
- revisor acessa as atribuídas;
- alteração após submissão segue máquina de estados;
- anexos usam URLs assinadas e expiração curta.

### Eventos e inteligência

- produto consome projeções e não exige acesso irrestrito ao log bruto;
- analytics utiliza IDs pseudônimos;
- relação com identidade ocorre em camada controlada;
- score e features possuem acesso mais restrito que progresso comum.

### HubSpot

- identidade de serviço lê/escreve somente campos do contrato;
- payload completo do evento não é enviado ao CRM;
- tokens ficam fora do banco de domínio e do repositório.

## 7. Separação de funções recomendada

Quando viável:

- quem edita conteúdo não publica a própria versão;
- quem cria regra de score não aprova uso produtivo;
- quem solicita exportação não aprova a própria exportação;
- suporte não assume identidade do usuário sem mecanismo auditado;
- revisão de submissão e alteração da rubrica publicada são capacidades distintas.

## 8. Requisitos para implementação

- capabilities centralizadas e tipadas;
- guards no servidor;
- policies RLS por entidade e vínculo;
- testes de autorização negativos e positivos;
- auditoria para ações elevadas;
- expiração de vínculos temporários;
- contas de serviço separadas;
- break-glass excepcional com justificativa e alerta;
- nenhuma policy pública `using (true)` para dados não explicitamente públicos.

## 9. Pendências

- papéis efetivamente existentes na operação;
- parceiros terão acesso direto na release inicial ou somente no futuro;
- quem revisará práticas;
- necessidade de impersonation para suporte;
- política para visualização de resultados diagnósticos;
- acesso institucional ao score experimental;
- matriz final aprovada de dados pessoais e crédito.
