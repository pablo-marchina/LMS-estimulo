# Solicitações de informação para produção

**Revisado em:** 2026-07-30  
**Status:** ativo

Este arquivo registra somente informações externas ou aprovações ainda necessárias para liberar o produto. Nunca registrar tokens, chaves, cookies, senhas ou dados pessoais reais no Git, issues, PRs ou chat.

## P0

### IR-001 — Credencial historicamente exposta

- confirmar rotação e revogação;
- revisar logs e uso indevido;
- registrar responsável e data em sistema institucional seguro.

### IR-002 — Diagnóstico oficial

Entregar e aprovar:

- versão, texto e instruções das perguntas;
- alternativas, condicionais e randomização;
- dimensões, pesos, normalização, cortes e empate;
- política de resposta ausente ou inconclusiva;
- textos de resultado;
- ativações e casos oficiais de teste;
- evidência metodológica, linguagem e privacidade.

A configuração de desenvolvimento não é fonte oficial.

### IR-003 — Conteúdo final da Jornada OpenAI

- vídeos, slides, transcrições e legendas;
- prompts, templates e materiais;
- URLs, direitos de uso e status editorial;
- ordem, pré-requisitos e durações;
- quick checks, provas, respostas e justificativas;
- práticas, rubricas, tentativas e feedback;
- critérios de conclusão;
- pontos, selos, certificados e validade;
- equivalências acessíveis;
- termos de upload e autorização.

### IR-004 — Identidade, site e dados de entrada

- origem do login ou SSO;
- tratamento de usuários existentes;
- nome, e-mail, CPF, telefone, CNPJ opcional e UTM;
- recuperação, merge, conflitos e suporte;
- provedor de identidade de produção;
- configuração de domínio e callbacks;
- identificadores autorizados para integrações futuras.

### IR-005 — Destino ETL futuro

A plataforma não depende de CRM ou destino externo específico. Antes de ativar um consumidor da outbox genérica, definir:

- finalidade e responsável pelo tratamento;
- contrato de dados e versão;
- identificadores mínimos;
- eventos, projeções e agregações permitidos;
- frequência, cursor e latência máxima;
- autenticação, scopes e rotação de segredo;
- idempotência, retry, dead letter e reconciliação;
- retenção, exclusão e direitos do titular;
- limites de volume e custo;
- ambiente de teste e evidência de escrita e leitura.

Até essa aprovação, os dados permanecem no PostgreSQL e a exportação fica inativa.

### IR-006 — Segurança, privacidade e operação

- controlador, encarregado e responsabilidades;
- inventário de tratamentos e bases legais;
- aviso de privacidade;
- direitos, retenção, anonimização, exclusão e legal hold;
- playbook de incidente;
- rate limiting e proteção de autenticação;
- threat model e política de arquivos;
- contratos, DPAs, regiões e subprocessadores;
- RPO/RTO, backup, restore e rollback;
- aprovações jurídica, de segurança e acessibilidade.

O scanner de malware foi removido por decisão vigente e não é uma solicitação aberta. Qualquer novo controle precisa de threat model e decisão própria.

### IR-007 — AWS staging

- conta, região e responsáveis;
- rede, domínio e certificados;
- segredos e chaves;
- decisão de identidade, banco e armazenamento;
- capacidade e custos;
- logs, métricas e alarmes;
- processo de plan/apply e rollback;
- restore e continuidade.

## P1

### IR-008 — Gamificação e participação

- pontos e recorrência;
- proteção contra abuso;
- conquistas e recompensas;
- ranking e privacidade;
- avaliação de utilidade;
- moderação;
- emissão, validade, revogação e reemissão de credenciais.

### IR-009 — Guia visual e acessibilidade

- guia de marca e assets aprovados;
- tipografia, cores, ícones e componentes;
- mobile e responsividade;
- critérios WCAG;
- teclado e leitores de tela;
- legendas, transcrições e equivalências;
- aprovação visual final.

### IR-010 — Dados históricos e pesquisa

Quando houver finalidade aprovada:

- cursos, mentorias, presença, conclusão e avaliações;
- aplicação de aprendizados;
- crédito e desfechos;
- identificadores legítimos;
- cobertura, consentimento, qualidade e viés;
- protocolo de análise e restrições para uso em crédito.

## Encerramento

Uma solicitação só é encerrada quando:

- o artefato ou decisão foi recebido;
- origem, versão e responsável foram registrados;
- privacidade e acesso foram definidos;
- implementação e documentação foram atualizadas;
- existe teste proporcional;
- a evidência é reproduzível.
