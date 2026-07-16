# Solicitações de informação

**Versão:** 1.1  
**Data:** 2026-07-16  
**Status:** ativo

A hierarquia está em [SOURCE_AUTHORITY_HIERARCHY.md](SOURCE_AUTHORITY_HIERARCHY.md), e o escopo HubSpot está na [DEC-070](../decisions/DEC-070-HUBSPOT-SCOPE.md).

Não incluir tokens, chaves, senhas, cookies ou dados pessoais reais em documentos, issues, PRs ou chat.

## IR-001 — Pacote de referências e proveniência

**Estado:** pacote recebido; preservação formal pendente.

Registrar:

- nomes originais dos arquivos;
- data de recebimento;
- hashes;
- responsável pela aprovação;
- versões ou substituições posteriores;
- local institucional seguro;
- relação com documentos canônicos.

## IR-002 — Inventário do HubSpot sandbox

Fornecer as informações descritas em [HUBSPOT_INVENTORY_REQUEST.md](../integrations/HUBSPOT_INVENTORY_REQUEST.md), incluindo:

- portal, licença e sandbox;
- objetos, propriedades e associações;
- custom objects e behavioral events disponíveis;
- regras de identidade e deduplicação;
- objetos e estados de crédito;
- workflows, webhooks e automações;
- limites de API e batch;
- catálogo de sinais de engajamento;
- catálogo de variáveis e resultados úteis para cálculo;
- catálogo de dados `not_synced`;
- reconciliação, acesso e privacidade.

## IR-003 — Fluxo e dados de crédito

Obter:

- estados da solicitação;
- transições e motivos;
- dados criados em cada estado;
- códigos de reprovação;
- significado de “quase aprovado”;
- desembolso, parcelas, atraso e regularização;
- identificadores de pessoa, empresa e operação;
- frequência e latência;
- fonte da verdade por campo;
- momentos de capacitação e intervenção;
- desfechos para pesquisa futura.

## IR-004 — Dados históricos

Confirmar existência, formato, qualidade e identificadores de:

- cursos, mentorias e WhatsApp;
- presença, conclusão, pesquisas e avaliações;
- aplicação de aprendizados;
- aprovação, reprovação e inadimplência;
- contatos, empresas e operações;
- vínculos legítimos entre capacitação e crédito;
- cobertura, consentimentos e viés de seleção.

## IR-005 — Conteúdo final da Jornada OpenAI

Confirmar e entregar:

- vídeos, slides, transcrições e legendas;
- prompts, templates, mapas e materiais;
- URLs e direitos de uso;
- ordem, pré-requisitos e durações;
- quick checks e avaliações finais;
- respostas, justificativas e nota mínima;
- práticas e rubricas;
- tentativas e feedback;
- critérios de conclusão;
- pontos, selos e certificados;
- equivalências acessíveis;
- status editorial.

## IR-006 — Regras internas de dados e segurança

Obter:

- política de privacidade;
- inventário de tratamentos;
- classificação dos dados;
- bases legais;
- textos de consentimento quando aplicáveis;
- retenção e legal hold;
- regras de acesso;
- direitos dos titulares;
- processo de incidentes;
- restrições para dados comportamentais e score;
- exigências de fornecedores e localização.

## IR-007 — Evidências para usuários reais

Obter e aprovar:

- controlador e responsabilidades;
- encarregado e canal;
- bases por atividade;
- aviso de privacidade;
- retenção, anonimização e exclusão;
- procedimento de direitos;
- playbook de incidente;
- contratos, DPAs, regiões e subprocessadores;
- conta, região, rede, domínios, KMS, IAM e secrets AWS;
- RPO/RTO e teste de restauração;
- inventário HubSpot e fluxo de crédito;
- governança para uso futuro de sinais em crédito;
- RIPD quando aplicável;
- scanner real de arquivos;
- rate limiting;
- secret scanning e rotação de credenciais.

## IR-008 — Pacote oficial do diagnóstico

**Prioridade:** P0.

Entregar ou aprovar:

1. versão vigente;
2. texto das 12 perguntas;
3. instruções e períodos de referência;
4. alternativas e chaves;
5. condicionais;
6. randomização;
7. obrigatoriedade;
8. vínculo com cinco dimensões;
9. pesos e contribuições;
10. normalização e cortes;
11. empate ou inconclusivo;
12. resposta ausente;
13. casos oficiais de entrada e saída;
14. textos dos quatro resultados;
15. plano de ação e ativações;
16. planilha de iteração e revisão;
17. evidência metodológica;
18. decisão sobre Q13;
19. aprovação de linguagem e privacidade;
20. estratégia Typeform e versionamento.

Estado reconciliado:

- 12 perguntas;
- 5 dimensões;
- 4 arquétipos;
- maturidade separada;
- Q13 não oficial sem aprovação;
- scoring do protótipo não oficial.

## IR-009 — Identidade e integração com o site

Definir:

- origem do login;
- SSO ou credenciais;
- nome, e-mail, CPF, telefone e CNPJ opcional;
- UTM;
- validação e consentimento;
- associação com contato HubSpot;
- criação de novo contato;
- merge e conflito;
- recuperação de conta;
- usuários administrativos;
- clientes com e sem crédito;
- identificadores mínimos usados pelo LMS;
- testes em Supabase e AWS.

## IR-010 — Catálogo de dados HubSpot

Aprovar quatro catálogos:

### `linking_identifier`

Somente IDs e chaves mínimos necessários para localizar ou associar o usuário.

### `engagement_signal`

Eventos e agregados de acesso, progresso, participação, avaliação, práticas, gamificação, credenciais, abandono e retorno.

### `calculation_input_or_result`

Entradas, features e resultados úteis para diagnóstico, classificação, personalização, análise ou pesquisa, com origem, versão, qualidade e governança.

### `not_synced`

Estado transacional detalhado, configuração e conteúdo editorial, payloads brutos sem finalidade, binários, logs, filas, retries e segredos.

## IR-011 — Regras de gamificação e participação

Aprovar:

- pontos e proteção contra abuso;
- conquistas;
- recompensas e resgate;
- ranking e privacidade;
- emissão e revogação de credenciais;
- avaliação em cinco estrelas;
- moderação e denúncia;
- SLA de revisão de práticas.

## IR-012 — Guia visual e assets

Obter:

- guia de marca;
- logos;
- tipografia e cores;
- ícones e componentes;
- critérios de uso dos mockups;
- requisitos mobile;
- aprovação visual.

## Critério geral de encerramento

Uma solicitação é encerrada somente quando:

- o artefato foi recebido ou a decisão aprovada;
- versão e origem foram registradas;
- documentação e backlog foram atualizados;
- implementação correspondente pode ser reproduzida;
- testes proporcionais existem;
- nenhuma lacuna foi preenchida por heurística silenciosa.
