# Decisões ativas da plataforma

Este registro contém apenas decisões vigentes que orientam o produto e a arquitetura. Histórico de decisões superadas permanece no Git.

| ID | Decisão | Consequência |
|---|---|---|
| DEC-011 | A aplicação é um monólito modular com contextos delimitados. | Módulos mantêm fronteiras explícitas; distribuição exige necessidade comprovada. |
| DEC-012 | Programa, jornada, trilha, etapa e atividade são conceitos distintos. | Modelo e UI preservam suas responsabilidades. |
| DEC-017 | Administração compõe os mesmos casos de uso do domínio. | Não existe backend paralelo de edição direta. |
| DEC-018 | Autorização usa capacidade, escopo, validade e finalidade. | Papéis são agrupamentos RBAC, não autorização universal. |
| DEC-025 | Exposição, compreensão, prática, feedback e conclusão são fatos distintos. | Uma métrica não substitui as demais. |
| DEC-026 | Pontos derivam de ledger idempotente. | Ranking, saldo e recompensas usam fatos auditáveis. |
| DEC-027 | Avaliações e credenciais preservam a regra aplicável. | Tentativas e emissões permanecem reproduzíveis quando a configuração muda. |
| DEC-035 | Diagnóstico/arquétipo servem a aprendizagem e pesquisa, não crédito por padrão. | Uso decisório exige governança específica. |
| DEC-043 | Base legal não é atribuída automaticamente pelo código. | Tratamento real depende de aprovação adequada. |
| DEC-047 | Retenção não é inventada pelo runtime. | Política destrutiva depende de regra aprovada e legal hold. |
| DEC-049 | Logs e eventos aplicam minimização/redaction antes de persistir dados proibidos. | Segredos e PII desnecessária não entram na evidência. |
| DEC-050 | Tabelas de aplicação mantêm defesa em profundidade com RLS/grants apropriados. | Novas migrations preservam o modelo de acesso. |
| DEC-051 | O repositório guarda referências de secrets, nunca valores. | Valores pertencem ao mecanismo do ambiente. |
| DEC-052 | Produção depende de gates verificáveis. | Build compilado não é sinônimo de prontidão operacional. |
| DEC-055 | O diagnóstico principal é configurável e auditável. | Perguntas, scoring, textos e ativações não são metodologia hardcoded. |
| DEC-056 | Instrumentos diagnósticos usam definição–versão–instância. | Sessões preservam a versão utilizada. |
| DEC-057 | Conteúdo próprio e externo usa modelo unificado e adapters. | Provider é detalhe de borda. |
| DEC-058 | Eventos estruturados só existem quando há finalidade e contrato. | Captura indiscriminada não é requisito. |
| DEC-059 | Supabase/Vercel são providers de desenvolvimento, teste e preview; a produção institucional segue a estratégia AWS. | Não existe fallback silencioso de produção para providers de teste. |
| DEC-060 | Código, migrations, testes e documentação canônica mudam juntos. | Manutenibilidade participa do aceite. |
| DEC-064 | Sinais educacionais não produzem efeito de crédito sem validação e governança. | Fronteiras mantêm separação explícita. |
| DEC-068 | O LMS é um produto mantido internamente; serviços externos são dependências de infraestrutura/borda. | Provider não substitui o domínio do produto. |
| DEC-069 | Credencial exposta é tratada como comprometida. | Rotação ocorre fora do Git; valores não entram em documentação. |
| DEC-070 | Integrações externas consomem projeções minimizadas por outbox e nunca são dependência síncrona do domínio. | Destino é substituível, idempotente e reconciliável. |
| DEC-072 | CPF usa proteção criptográfica e lookup independente conforme contrato de identidade. | Valor bruto não entra em metadata, URL, logs ou eventos. |
| DEC-073 | Experiências reutilizam o runtime real antes de criar implementações paralelas. | Painel, perfil, ranking e administração compartilham capacidades do domínio. |
| DEC-074 | Documentação canônica descreve contratos permanentes, não resultados pontuais de auditoria ou release. | Evidência histórica fica no GitHub/artifacts. |
| DEC-075 | O empacotamento web para a fronteira AWS usa `Dockerfile.lambda`; demais decisões dependem de contratos explícitos. | Provider de produção falha fechado quando a fronteira necessária não está implementada. |
| DEC-076 | Jornada é um registro operacional único `draft ↔ published`. | `journey_version*` é compatibilidade física, não versionamento editorial navegável. |
| DEC-077 | Administração exige identidade federada válida, identidade interna, membership Estímulo e RBAC. | Domínio de e-mail isolado não concede acesso. |
| DEC-078 | Superfícies legadas congeladas só evoluem por substituição semântica governada, sem ampliar desnecessariamente a superfície pública/opaca. | Compatibilidade é preservada e qualquer mudança é provada por replay e contrato. |