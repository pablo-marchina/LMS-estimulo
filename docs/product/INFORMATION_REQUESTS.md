# Solicitações de informação

**Versão:** 1.0  
**Data:** 2026-07-16  
**Status:** ativo

Este documento lista informações e artefatos faltantes. A hierarquia de fontes está em [SOURCE_AUTHORITY_HIERARCHY.md](SOURCE_AUTHORITY_HIERARCHY.md).

Não incluir tokens, chaves, senhas, cookies ou dados pessoais reais em documentos, issues, PRs ou chat.

## IR-001 — Pacote de referências e proveniência

**Estado:** pacote recebido e hierarquia definida; preservação formal pendente.

Registrar de forma controlada:

- nome original dos 17 arquivos;
- data de recebimento;
- hash dos arquivos;
- responsável pela aprovação;
- versão/substituição posterior;
- local institucional seguro do pacote;
- relação entre cada fonte e os documentos canônicos do repositório.

O repositório não precisa conter segredos ou cópias integrais de documentos sensíveis, mas precisa preservar proveniência e rastreabilidade.

## IR-002 — Inventário completo do HubSpot sandbox

Fornecer as informações descritas em [HUBSPOT_INVENTORY_REQUEST.md](../integrations/HUBSPOT_INVENTORY_REQUEST.md), incluindo:

- conta, portal, licença e sandbox;
- objetos, propriedades e associações;
- objetos/eventos personalizados;
- CPF, CNPJ e regras de deduplicação;
- objetos e estados de crédito;
- workflows e automações;
- webhooks;
- limites de API e batch;
- estratégia para representar todos os dados do usuário;
- reconciliação;
- regras de acesso e privacidade.

## IR-003 — Fluxo e dados de crédito

Obter:

- estados da solicitação;
- transições e motivos;
- dados criados em cada estado;
- critérios e códigos de reprovação;
- significado operacional de “quase aprovado”;
- desembolso, parcela, atraso, regularização e encerramento;
- identificadores de pessoa, empresa e operação;
- frequência e latência;
- fonte da verdade por campo;
- momentos de capacitação/intervenção;
- desfechos que poderão ser usados em pesquisa futura.

## IR-004 — Dados históricos

Confirmar existência, formato, qualidade e identificadores de:

- participação em cursos, mentorias e WhatsApp;
- presença, conclusão, pesquisas e avaliações;
- aplicação de aprendizados;
- aprovação, reprovação e inadimplência;
- contatos, empresas e operações;
- dados que permitam relacionar capacitação e crédito legitimamente;
- consentimentos e bases aplicáveis;
- viés de seleção e cobertura.

## IR-005 — Conteúdo final da Jornada OpenAI

Confirmar e entregar:

- vídeos, slides, transcrições e legendas;
- prompts, templates, mapas e materiais;
- URLs e direitos de uso;
- ordem, pré-requisitos e durações;
- avaliações rápidas e finais;
- respostas, justificativas e nota mínima;
- atividades práticas e rubricas;
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
- restrições para uso de dados comportamentais e score;
- exigências de fornecedores, nuvem e localização.

## IR-007 — Evidências para liberar usuários reais

Obter e aprovar:

- controlador e responsabilidades;
- encarregado/canal;
- bases por atividade;
- aviso de privacidade;
- retenção, anonimização e exclusão;
- procedimento de direitos;
- playbook e contatos de incidente;
- contratos, DPAs, regiões e subprocessadores;
- conta, região, rede, domínios, KMS, IAM e secrets AWS;
- RPO/RTO e teste de restauração;
- inventário HubSpot e fluxo real de crédito;
- governança para uso futuro de sinais em crédito;
- RIPD quando aplicável;
- scanner real de arquivos;
- rate limiting e proteção contra abuso;
- secret scanning e rotação de credenciais expostas.

## IR-008 — Pacote oficial do diagnóstico e dos quatro arquétipos

**Prioridade:** P0.

Entregar ou aprovar:

1. versão vigente;
2. texto exato das 12 perguntas;
3. instruções e períodos de referência;
4. alternativas e chaves estáveis;
5. condicionais;
6. randomização;
7. obrigatoriedade;
8. vínculo com as cinco dimensões;
9. pesos/contribuições;
10. normalização e cortes;
11. regra de empate ou inconclusivo;
12. resposta ausente;
13. casos oficiais de entrada/saída;
14. textos dos quatro resultados;
15. plano de ação e ativações;
16. planilha de iteração e log de revisão;
17. evidência metodológica;
18. decisão sobre Q13;
19. aprovação de linguagem, privacidade e consequências;
20. estratégia Typeform e versionamento das respostas.

### Estado reconciliado

- 12 perguntas;
- 5 dimensões;
- 4 arquétipos;
- maturidade como eixo separado;
- Q13 não oficial sem aprovação;
- scoring do protótipo não oficial.

## IR-009 — Identidade e integração com o site

Definir:

- origem oficial do login;
- SSO ou fluxo de credenciais;
- campos nome, e-mail, CPF, telefone e CNPJ opcional;
- captura e persistência de UTM;
- regras de validação;
- associação com contato HubSpot existente;
- criação de novo contato;
- merge e conflito;
- recuperação de conta;
- usuários administrativos por e-mail Estímulo;
- jornada de cliente com crédito e sem crédito;
- testes de identidade em Supabase e AWS.

## IR-010 — Regras de gamificação e participação

Aprovar:

- pontos por ação;
- proteção contra abuso;
- conquistas;
- recompensas e resgate;
- ranking e visibilidade;
- opt-out e privacidade;
- emissão/revogação de selos e certificados;
- avaliação de cinco estrelas;
- moderação e denúncia de comentários;
- SLA de revisão de práticas.

## IR-011 — Guia visual e assets oficiais

Obter:

- guia de marca;
- logo e variações aprovadas;
- tipografia;
- cores;
- ícones;
- componentes de referência;
- critérios de uso dos mockups Lovable;
- requisitos mobile;
- aprovação visual final.

## Critério geral de encerramento

Uma solicitação é encerrada somente quando:

- o artefato foi recebido ou a decisão foi aprovada;
- a versão e origem foram registradas;
- documentação e backlog foram atualizados;
- a implementação correspondente pode ser reproduzida;
- casos de teste proporcionais existem;
- nenhuma lacuna foi preenchida por heurística silenciosa.
