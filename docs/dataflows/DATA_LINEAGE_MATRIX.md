# Matriz de linhagem de dados

**Versão:** 0.1  
**Status:** Modelo lógico E09; campos e retenções finais dependem do E10/E13.

| Objeto de informação | Origem autorizada | Store primário | Representação em evento | Transformações | Destinos permitidos | Proibido por padrão |
|---|---|---|---|---|---|---|
| Conta de acesso | Cadastro/provedor de identidade | Identity store | `user_account_id` opaco | status e auditoria | autorização, suporte | senha, token, e-mail no event store |
| Empreendedor | Cadastro/HubSpot reconciliado | Identity store | `entrepreneur_id` opaco | identidade resolvida | jornadas, CRM aprovado | PII direta em eventos |
| Negócio beneficiário | Cadastro/CRM/fonte oficial | Business store | `business_id` opaco | vínculos e atributos aprovados | jornada, CRM, análise autorizada | documentos societários em eventos |
| Jornada publicada | Administração autorizada | Catalog store | IDs e versão | snapshot imutável | orquestração, cache | edição in-place da versão publicada |
| Participação | Orquestração | Journey store | enrollment/journey IDs | progresso e marcos | UI, operação, CRM agregado | usar nome da jornada como chave |
| Resposta diagnóstica | Participante | Diagnostic store restrito | IDs de pergunta/opção/versão | dimensão e recomendação | personalização, pesquisa governada | texto livre e demografia no evento |
| Resultado de diagnóstico | Engine versionada | Diagnostic/result store | IDs, versão e incerteza | segmentos operacionais | orquestração e UI | score de crédito ou rótulo permanente |
| Observação de conteúdo | Browser validado | Event store | metadados mínimos | consolidação de progresso | projeções e pesquisa | tratar como conclusão automática |
| Tentativa de avaliação | Participante/backend | Assessment store | attempt/question IDs e resultado | scoring versionado | jornada, feedback | resposta integral no evento |
| Evidência prática | Participante | Object storage + Practice store | `evidence_id`, hash/metadados | scan, revisão, validação | reviewer autorizado | URL assinada ou arquivo no evento |
| Pontos e selos | Gamification engine | Ledger/award store | evento derivado | saldo/projeção | UI | feature comportamental bruta |
| Certificado | Credential engine | Credential store | ID, versão e snapshot ref | documento verificável | participante/verificação | alegação além da evidência satisfeita |
| Intervenção | Orchestrator | Intervention store | IDs, gatilho e resultado | prioridade/cooldown | canal e operação | conteúdo pessoal desnecessário |
| Evento canônico | Backend/conector verificado | Event store | envelope + payload mínimo | roteamento/projeções | consumidores aprovados | alteração ou exclusão arbitrária |
| Feature comportamental | Pipeline versionado | Feature store | evento de cálculo opcional | janela, qualidade, fórmula | pesquisa/score experimental | substituir evento de origem |
| Score experimental | Pipeline aprovado | Score store | ID, versão e explicação | calibração/validação | pesquisa restrita | HubSpot/crédito sem gate posterior |
| Propriedade HubSpot | Plataforma ou CRM conforme ownership | Integration/CRM | sync IDs e resultado | mapping e reconciliação | HubSpot | cada clique, resposta ou arquivo |
| Estágio de crédito | Sistema oficial futuro | External integration store | código/versionamento aprovado | projeção autorizada | intervenções/estudos aprovados | inferir ou inventar estados |
| Logs e traces | Runtime | Observability store | não é evento de negócio | agregação técnica | operação/segurança | payload pessoal ou resposta de usuário |
