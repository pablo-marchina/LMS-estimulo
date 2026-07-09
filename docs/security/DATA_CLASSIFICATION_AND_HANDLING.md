# Classificação de dados e regras de manuseio

## Modelo

O banco registra oito classificações ordenadas por criticidade. A classificação é aplicada a ativos, e não inferida apenas pelo nome de uma coluna. Um mesmo arquivo pode exigir reclassificação conforme o perfil de upload e seu conteúdo.

| Código | Natureza | Regra principal |
|---|---|---|
| `public` | divulgação aprovada | pode ser exposto somente após publicação deliberada |
| `internal` | operação interna | acesso por necessidade de trabalho; logs minimizados |
| `confidential` | negócio/segurança | acesso explícito, criptografia e logs redigidos |
| `personal` | dado pessoal | finalidade, necessidade, acesso restrito e rastreabilidade |
| `behavioral_profile` | inferência comportamental | revisão de alto risco, explicabilidade e uso em crédito bloqueado |
| `credit_related` | contexto de crédito | acesso estrito, auditoria e governança de crédito |
| `sensitive_personal` | dado sensível | acesso estrito; payload bruto proibido em logs; RIPD quando aplicável |
| `secret` | credencial/chave | valor somente em secret manager; log e persistência de aplicação proibidos |

## Regras obrigatórias

- Classificar cada novo ativo antes da ativação de sua atividade de tratamento.
- Não usar `confidential` para esconder dados pessoais; a classificação deve refletir a natureza real.
- Tratar respostas diagnósticas, features e scores como perfil comportamental, mesmo quando pseudonimizados.
- Tratar qualquer ligação com candidatura, contrato, cobrança ou recuperação como contexto de crédito.
- Não armazenar documentos ou textos livres sem perfil de upload, finalidade, limite de tamanho, tipos aceitos e retenção.
- Não colocar dados sensíveis em eventos comportamentais; quando indispensável, criar evento dedicado, schema restrito e aprovação específica.
- Aplicar minimização no frontend e backend: ocultação visual não elimina coleta ou acesso.

## Ativos inventariados

Foram catalogados 18 ativos: contas, perfil do empreendedor, negócio, respostas/resultados diagnósticos, progresso, avaliações, práticas, arquivos, eventos, features, scores experimentais, auditoria, mappings CRM, incidentes, consentimentos e solicitações de titulares.

## Informações ainda necessárias

- campos reais do HubSpot e respectivas fontes;
- dados usados no processo de crédito antes, durante e depois da concessão;
- documentos permitidos nos uploads e seus riscos;
- categorias de dados de pesquisas e entrevistas;
- presença de dados de menores, biometria, saúde ou outros dados sensíveis;
- relatórios exportados e pessoas/sistemas que os recebem.
