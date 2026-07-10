# Solicitações de informação

Este documento lista exatamente o que precisa ser buscado. Não inclui nomes de pessoas; apenas informações e artefatos.

## IR-001 — Repositório completo

**Necessário agora:** enviar um ZIP da branch principal do repositório.

Conteúdo esperado:
- código-fonte;
- `package.json` e lockfile;
- `.env.example`, sem segredos;
- pasta `database`;
- migrations/seeds;
- `design.md`;
- PDF final da Jornada OpenAI;
- screenshots/mockups;
- documentação.

**Motivo:** o acesso web permite visualizar arquivos isolados, mas não executar, testar dependências ou auditar o repositório inteiro.

## IR-002 — Inventário do HubSpot sandbox

Fornecer export ou documentação com:
- plano/licença;
- objetos usados;
- propriedades de contato, empresa e negócio;
- pipelines e etapas;
- workflows;
- listas;
- objetos personalizados;
- associações;
- webhooks e eventos personalizados disponíveis;
- regras de duplicidade;
- identificadores usados;
- limites de API;
- integrações atuais.

Não enviar tokens ou chaves no chat.

## IR-003 — Fluxo e dados de crédito

Obter:
- estados possíveis da solicitação;
- transições e motivos;
- dados criados em cada estado;
- critérios e códigos de reprovação;
- significado operacional de “quase aprovado”;
- dados de desembolso, parcela, atraso, regularização e encerramento;
- identificadores de pessoa, empresa e operação;
- frequência e latência das atualizações;
- fonte da verdade de cada campo;
- desfechos que poderão ser usados em pesquisa futura.

## IR-004 — Dados históricos

Confirmar existência, formato e identificadores de:
- participação em cursos, mentorias e WhatsApp;
- presença, conclusão, pesquisas e avaliações;
- aplicação de aprendizados;
- aprovação, reprovação e inadimplência;
- dados que permitam relacionar capacitação e crédito legitimamente.

## IR-005 — Conteúdo final da Jornada OpenAI

Confirmar:
- todos os arquivos e URLs;
- ordem e pré-requisitos;
- duração;
- avaliações;
- atividades práticas;
- critérios de conclusão;
- pontos, selos e certificado;
- acessibilidade;
- direitos de uso;
- status editorial.

## IR-006 — Regras internas de dados e segurança

Obter:
- política de privacidade e retenção;
- classificação dos dados;
- requisitos de consentimento;
- regras de acesso;
- processo de resposta a incidentes;
- restrições para uso de dados comportamentais e score;
- exigências de fornecedores de nuvem e localização dos dados.

## IR-007 — decisões e evidências para liberar o gate de segurança

Obter e aprovar, sem compartilhar segredos no chat:

- entidade jurídica controladora e escopo das responsabilidades;
- encarregado, ato de designação ou análise de dispensa, canal público e substituição;
- bases legais por atividade de tratamento;
- aviso de privacidade e textos de consentimento versionados;
- prazos de retenção, gatilhos, anonimização e legal holds;
- canal e procedimento de direitos dos titulares;
- playbook, contatos e critérios de comunicação de incidentes;
- contratos, DPAs, regiões, subprocessadores e transferências de Supabase, AWS e HubSpot;
- conta, região, rede, domínios, KMS, IAM, Secrets Manager, backup/PITR e logs AWS;
- RPO/RTO e relatório de teste de restauração;
- inventário real do HubSpot e fluxo real de crédito;
- governança para qualquer uso de sinais em crédito: finalidade, revisão humana, explicação, contestação, equidade, validação e monitoramento;
- RIPD efetivo para perfilamento/alto risco, quando aplicável.

**Motivo:** o código e o banco não podem decidir essas matérias. O gate de produção permanece bloqueado até que as evidências sejam registradas e verificadas.
