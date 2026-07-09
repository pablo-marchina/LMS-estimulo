# E14 — auditoria do contexto e das fontes antes do Passo 3

**Data:** 2026-07-09  
**Status:** REVIEWED  
**Fonte principal:** `Estimulo_all.md`

## 1. Natureza do documento

`Estimulo_all.md` não é uma especificação técnica única. Ele reúne materiais de momentos e finalidades diferentes:

1. briefing original da área de Capacitação de Crédito;
2. tese estratégica de integração entre capacitação e jornada do empreendedor;
3. referências de produto e tecnologia;
4. proposta e escopo do trabalho;
5. materiais institucionais do Estímulo;
6. Teoria da Mudança de 2024 e referências de impacto.

Essas camadas não podem receber o mesmo peso. Afirmações históricas e aspiracionais devem ser interpretadas à luz das decisões atuais do projeto.

## 2. Hierarquia correta das fontes

A prioridade adotada a partir desta auditoria é:

1. decisões e correções explícitas mais recentes do responsável pelo projeto;
2. repositório privado `pablo-marchina/LMS-estimulo` e projeto Supabase conectado, como verdade operacional;
3. `Estimulo_all.md` e demais documentos fornecidos, como verdade de produto, estratégia e contexto;
4. repositório público `denilsontorres2024/plataforma-estimulo`, como fundação inicial de interface e LMS;
5. Dash Empreendedor no Lovable, como protótipo de experiência;
6. Impulso Stone, Cativa e Toolzz, como benchmarks.

O repositório público e o Lovable não substituem o repositório privado. Entretanto, também não podem ser ignorados ao mapear o frontend.

## 3. Definição real do produto

O produto não deve ser tratado apenas como um catálogo de cursos. O contexto descreve uma infraestrutura de relacionamento e desenvolvimento do empreendedor, com capacidade futura de:

- ativar conteúdo em momentos relevantes da jornada;
- personalizar caminhos conforme contexto e evidências;
- registrar sequência, momento, canal e contexto das interações;
- alimentar ciclos de aprendizagem sobre a efetividade das intervenções;
- acomodar comunidade, mentorias, conexões e lentes de impacto;
- manter múltiplas jornadas, parceiros e conteúdos.

A primeira release continua sendo uma plataforma multi-jornada em produção. A Jornada OpenAI é o primeiro conteúdo planejado, não o limite estrutural do produto.

## 4. Princípios confirmados

### 4.1 Ativação é mais importante que simples hospedagem

A tese central é entregar o conteúdo adequado no momento adequado para o contexto adequado. Isso exige que o domínio preserve gatilho, versão, sequência, exposição e resposta — não apenas “curso concluído”.

### 4.2 Fatos observáveis são diferentes de interpretações

A Teoria da Mudança distingue atividades, produtos, resultados e impactos. A plataforma deve fazer a mesma separação:

- evento bruto: atividade iniciada, resposta enviada, retorno após inatividade;
- resultado pedagógico: avaliação aprovada, artefato revisado;
- resultado no negócio: aplicação posterior comprovada;
- impacto ou uso em decisões externas: depende de validação adicional.

Conclusão, pontos ou frequência não autorizam inferências automáticas sobre risco, capacidade ou impacto.

### 4.3 Capacitação, crédito e conexão são domínios relacionados, mas distintos

A arquitetura deve permitir integração futura sem fundir regras. Elegibilidade para uma capacitação não deve ser confundida com elegibilidade para um produto financeiro. Comunidade, mentoria e conexão devem permanecer extensões possíveis, não dependências da primeira vertical.

### 4.4 AI-first significa base preparada, não automação prematura

O documento pede uma solução preparada para inteligência desde o início. A interpretação correta é:

- eventos confiáveis;
- conteúdo e regras versionados;
- evidência rastreável;
- decisões reproduzíveis;
- avaliação longitudinal;
- adapters substituíveis.

Não significa implementar agora modelos automáticos ou interpretações não validadas.

## 5. Hipóteses históricas que não são requisitos atuais da vertical

O briefing original cita quatro perfis comportamentais, integrações com HubSpot e Zapier, Lovable como frontend e uso futuro dos sinais em crédito. Esses elementos explicam a origem do desafio, mas não estão automaticamente aprovados para implementação agora.

Também aparece o termo “MVP” em materiais históricos. Para a execução atual, permanece válida a decisão posterior: a primeira entrega é uma versão de produção, não um protótipo provisório.

## 6. Análise das referências de frontend

### 6.1 Repositório privado operacional

Contém schema, domínio, migrations, adapters, Edge Functions, testes e documentação. Sua árvore atual não contém uma aplicação Next.js executável.

### 6.2 Fundação pública Next.js

O repositório público contém uma aplicação Next.js real com rotas de marketing, autenticação, participante e administração, além de componentes, módulos, serviços Supabase e design system.

Pode fornecer:

- app shell e navegação;
- componentes visuais;
- estrutura de rotas;
- tokens e referências de design;
- padrões iniciais de formulário e responsividade.

Não deve fornecer a verdade de dados. O schema público é uma modelagem LMS simples e incompatível com o domínio operacional versionado. Ele permite escritas diretas do cliente em progresso, tentativas e respostas, contrariando o command layer transacional definido no Passo 2.

O arquivo de jornada também marca o curso OpenAI como publicado, embora os vídeos estejam vazios e as avaliações reais não estejam definidas. Esses dados devem ser classificados como hardcoded e removidos do runtime.

### 6.3 Dash Empreendedor no Lovable

O protótipo mostra a intenção de navegação entre perfil, trilhas, progresso e engajamento. Atualmente exibe valores vazios para score, módulos e pontos e depende de um diagnóstico externo para mostrar um arquétipo.

Ele é útil para compreender linguagem e experiência pretendida, mas não comprova autenticação, persistência, personalização ou integração.

### 6.4 Benchmarks

Impulso Stone reforça conteúdo prático, acompanhamento, comunidade e mentoria. Cativa e Toolzz demonstram padrões de hospedagem, gamificação, comunidade, notificações, integrações e monitoramento. Como o desenvolvimento deve ser interno, essas referências orientam requisitos e experiência, não a aquisição da plataforma.

## 7. Correções aos registros anteriores

### Correção 1 — frontend

Formulação anterior imprecisa:

> não existe aplicação/frontend executável.

Formulação correta:

> não existe aplicação Next.js executável dentro do repositório privado operacional atual; porém existe uma fundação Next.js pública e um protótipo Lovable explicitamente indicados pelo contexto, que precisam ser auditados e reconciliados.

### Correção 2 — estado do Passo 0

Pelo critério estrito do E14.1, o Passo 0 permanece `PARTIAL`, porque aplicação e infraestrutura ainda não formam um baseline único e reproduzível. A execução avançou por exceção aceita, assim como ocorreu com a decisão de não criar uma Preview Branch.

Isso não invalida os artefatos dos Passos 1 e 2. Apenas impede afirmar que o baseline completo da aplicação já estava reconciliado.

## 8. Efeito sobre os Passos 1 e 2

O bloqueio editorial da Jornada OpenAI permanece correto. A fundação pública reforça esse diagnóstico: há títulos e estruturas, mas ativos vazios e ausência dos instrumentos reais de avaliação.

Os contratos do Passo 2 também permanecem válidos. O ajuste necessário é substituir “aplicação ausente” por “aplicação existente fora do repositório operacional e ainda não integrada”.

## 9. Regra de entrada revisada para o Passo 3

O Passo 3 deverá auditar conjuntamente:

1. fundação pública Next.js;
2. protótipo Lovable;
3. domínio, autenticação e contratos do repositório privado.

Cada rota, componente e fonte de dados será classificada como:

- `KEEP`;
- `REFACTOR`;
- `REPLACE`;
- `REMOVE_FROM_RUNTIME`.

O resultado deverá incluir:

- inventário de rotas e componentes;
- dados fixos e mocks;
- acessos diretos incompatíveis com o command layer;
- divergências de autenticação e autorização;
- componentes visuais reutilizáveis;
- mapa de migração para o repositório privado;
- decisão explícita sobre incorporar o frontend como diretório, pacote ou aplicação separada no mesmo monorepo.

## 10. Conclusão

A análise do contexto muda o ponto de partida do Passo 3. Não construiremos uma interface do zero por ausência presumida, nem conectaremos o schema público ao Supabase operacional. Primeiro será feita uma reconciliação controlada: reaproveitar a experiência e os componentes úteis da fundação, substituir seus dados e regras pelo domínio privado e remover do runtime toda premissa editorial ou comportamental não aprovada.
