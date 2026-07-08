# Premissas e escopo

**Versão:** 0.2  
**Status:** Baseline inicial

## Problema central

A Estímulo precisa transformar capacitação de uma entrega isolada em uma camada integrada à jornada de crédito. Cada interação relevante deve ser registrada como fato comportamental estruturado, preservando contexto, sequência e temporalidade para personalização e futura pesquisa de utilidade em crédito.

## Resultado de produto esperado

Uma plataforma interna que permita:

- hospedar e versionar jornadas, trilhas, cursos, módulos, conteúdos e atividades;
- personalizar a experiência a partir de diagnóstico e contexto;
- registrar progressão, avaliações, atividades práticas, pontos, selos e certificados;
- capturar eventos comportamentais brutos e imutáveis;
- derivar características comportamentais versionadas;
- sincronizar apenas agregados e fatos relevantes com o HubSpot;
- acomodar novas jornadas sem duplicar tabelas ou criar código específico por jornada.

## Natureza da primeira entrega

A primeira entrega será uma **release inicial de produção**, pronta para deploy e operação real. O escopo será deliberadamente limitado, mas todo componente incluído deverá atender aos requisitos de segurança, integridade, testes, observabilidade, recuperação, acessibilidade, documentação e manutenção.

## Escopo funcional inicial

- Uma jornada: **Jornada OpenAI/IA**.
- Estrutura preparada para múltiplas jornadas futuras.
- Diagnóstico operacional v0.2 orientado a dimensões e segmentos, sem arquétipos validados.
- Quatro arquétipos desativados até pesquisa e validação posterior.
- Estrutura de momentos de intervenção definida; regras e tempos finais serão refinados.
- Score comportamental inicialmente experimental e não decisório.
- HubSpot como CRM e sistema de relacionamento.
- Banco e demais componentes ainda a definir.

## Fora do escopo da fase inicial

- decisão automática de crédito;
- score produtivo usado para aprovar ou rejeitar crédito;
- múltiplas jornadas completas;
- marketplace;
- aplicativo mobile nativo;
- compra de LMS;
- comunidade social completa;
- automações multicanal complexas.

## Princípios

1. Eventos observados devem ser separados de interpretações.
2. O modelo de dados não deve depender da interface atual.
3. A Jornada OpenAI não pode ficar codificada como caso especial.
4. Dados detalhados permanecem na plataforma; o HubSpot recebe somente o necessário.
5. Toda regra, jornada, diagnóstico, feature e score deve possuir versão.
6. Conclusão de conteúdo não equivale a aprendizagem, aplicação ou menor risco.
7. Arquitetura e schema existentes precisam ser provados, não presumidos.
8. Escopo inicial limitado não reduz o padrão de produção.
9. Não serão publicados mocks, métricas fictícias ou fluxos sem recuperação operacional.
10. A liberação inicial poderá ser progressiva, mas ocorrerá em ambiente produtivo.
