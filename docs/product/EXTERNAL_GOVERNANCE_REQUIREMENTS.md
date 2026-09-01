# Requisitos externos e de governança

Este documento define informações e aprovações que precisam existir **quando a capacidade correspondente for ativada**. Ele não registra pendências de uma entrega específica.

## Identidade e acesso

A operação de um provider de identidade exige:

- issuer, client, redirects e origens autorizadas;
- política de vínculo entre identidade externa e conta interna;
- recuperação, revogação, MFA e suporte;
- requisitos de contas administrativas;
- responsável pela configuração e rotação de credenciais.

## Diagnóstico oficial

Um diagnóstico apresentado como oficial exige fonte e aprovação para:

- texto e instruções das perguntas;
- alternativas e condicionais;
- dimensões, contribuições, normalização, cortes e desempate;
- tratamento de resposta ausente ou inconclusiva;
- textos de resultado e ativações;
- casos de referência e versão metodológica;
- evidência metodológica, linguagem, privacidade e acessibilidade.

Configuração de desenvolvimento não substitui metodologia aprovada.

## Conteúdo e jornadas

Uma jornada publicada para usuários reais exige, conforme aplicável:

- mídias, materiais, prompts, templates e links autorizados;
- ordem, pré-requisitos e durações coerentes;
- transcrições, legendas e equivalências acessíveis;
- avaliações, respostas, justificativas, rubricas e tentativas;
- critérios de progressão e conclusão;
- regras de pontos, badges, recompensas e certificados;
- direitos de uso e termos para uploads ou divulgação.

## Integrações externas

Antes de ativar um consumidor de outbox, devem estar definidos:

- finalidade e proprietário;
- contrato de dados e versionamento;
- identificadores e campos mínimos;
- autenticação, scopes e rotação;
- idempotência, retry, dead letter e reconciliação;
- retenção, exclusão e direitos do titular;
- limites de volume, custo e disponibilidade;
- ambiente de teste e evidência de leitura/escrita.

O destino externo não se torna fonte operacional do LMS por ser habilitado.

## Segurança, privacidade e operação

Tratamentos reais exigem, conforme seu escopo:

- controlador, operadores, encarregado/canal e responsabilidades;
- ROPA, base legal e avisos aplicáveis;
- retenção, anonimização, exclusão e legal hold;
- threat model e proteção contra abuso;
- contratos, subprocessadores, regiões e transferências;
- custódia e rotação de chaves;
- RPO/RTO, backup, restore, rollback e resposta a incidente;
- aprovações jurídica, de segurança, conteúdo e acessibilidade.

## Infraestrutura

Um ambiente institucional exige decisões explícitas sobre:

- conta, região, rede, domínio e certificados;
- identidade, banco e armazenamento;
- segredos e criptografia;
- capacidade, custo e SLOs;
- logs, métricas, alertas e on-call;
- deploy, promoção, rollback e continuidade.

## Dados de pesquisa

Uso de histórico de capacitação, comportamento ou crédito exige finalidade aprovada, identificadores legítimos, cobertura conhecida, qualidade, análise de viés e separação entre pesquisa e decisão operacional.

## Regra de aceite

Uma capacidade dependente de informação externa só é considerada pronta quando a fonte, versão, responsável, finalidade, acesso e evidência proporcional estão definidos e a implementação correspondente passa pelos gates aplicáveis.