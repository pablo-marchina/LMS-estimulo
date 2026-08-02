# Auditoria das correções definitivas

Esta página registra a revisão técnica das correções realizadas na interface administrativa, experiência participante, aula, preview e score comportamental. O objetivo é distinguir correções estruturais de remendos visuais ou dependências frágeis.

## Critérios de aceitação

Uma correção é considerada definitiva quando:

- a causa raiz foi corrigida na camada responsável;
- a regra crítica é validada também no servidor ou no banco, e não apenas no navegador;
- o fluxo não depende de mensagens internas do framework tratadas como erros comuns;
- estados persistidos possuem idempotência e validação de domínio;
- o layout não depende de CSS inline ou do nome de classes utilitárias geradas;
- existe contrato automatizado cobrindo a regressão;
- migrations aplicadas e arquivos versionados possuem a mesma versão;
- o deploy compila, passa pelo TypeScript e não introduz erros de runtime.

## Resultado da revisão

### Carregamento da plataforma

- Um indicador global único substitui os skeletons.
- O primeiro carregamento e as navegações usam a mesma barra.
- Indicadores duplicados exclusivos do participante foram removidos.

**Estado:** definitivo. A política está centralizada no shell da aplicação e protegida por contrato.

### Salvamento de B2B e configuração do score

- Os redirecionamentos do Next.js acontecem fora do bloco `try/catch`.
- `NEXT_REDIRECT` não é mais convertido em falha de persistência.
- Erros do gateway preservam códigos de domínio seguros.

**Estado:** definitivo. O fluxo separa persistência, invalidação de cache e navegação.

### Configuração do score

- Cliente e banco validam pesos, normalização, códigos, faixas e cobertura das classificações.
- A configuração anterior permanece ativa se uma nova configuração for inválida.
- O recálculo é executado após uma configuração válida.

**Estado:** definitivo. A integridade não depende da interface administrativa.

### Preview participante

- O preview reutiliza as rotas, componentes e dados reais do participante.
- A sessão temporária exige administrador da organização.
- O participante selecionado é revalidado no backend.
- RPCs permitidos usam allowlist somente de leitura.
- Escritas são bloqueadas no gateway mesmo se a proteção visual for contornada.
- O cookie temporário é HTTP-only, restrito e expira rapidamente.

**Estado:** definitivo. A fidelidade vem do runtime real e a segurança é aplicada no servidor.

### Layout e navegação da aula

- A aula possui largura integral, abas e scroll normal do documento.
- Apenas a etapa ativa fica visível.
- Links internos ativam a aba correspondente.
- A avaliação retorna para a aba de conteúdo sem desmontar as abas.
- A lateral permanece compacta e sticky somente em telas grandes.
- O CSS da rota usa uma fronteira semântica própria e relações `main + aside`; não depende mais de combinações de classes Tailwind.
- O listener de navegação está limitado ao workspace da aula, não ao documento inteiro.

**Estado:** definitivo. Permanecem IDs semânticos estáveis (`conteudo`, `avaliacao`, `pratica`, `comentarios`) como contrato entre navegação e layout.

### Avaliação da aula e verificação

- A avaliação é aceita nos estados válidos da aula.
- A verificação considera os materiais obrigatórios reais, em vez das quatro seções editoriais antigas.
- Tentativas e avaliações continuam idempotentes.
- Falhas retornam códigos de domínio em vez da página genérica.

**Estado:** definitivo. O banco está alinhado ao modelo atual de conteúdo.

### Nomes de jornadas e trilhas

- O estado participante retorna o título editorial persistido.
- Identificadores técnicos são usados apenas como fallback formatado.
- Underscores e nomes totalmente minúsculos não são exibidos como título principal.

**Estado:** definitivo. A fonte de verdade é o catálogo; a formatação local é apenas contingência.

### Densidade das telas participantes

- A política de densidade é aplicada somente dentro do shell participante.
- Componentes de marca possuem regras explícitas.
- A aula possui uma política específica independente da densidade geral.

**Estado:** definitivo para a superfície participante atual. Novos componentes devem adotar os mesmos componentes compartilhados ou classes de marca, em vez de criar espaçamentos isolados.

### Pontos e score comportamental

- Pontos e score continuam sendo conceitos distintos, mas eventos reais de aprendizagem alimentam ambos quando aplicável.
- Conclusão, entrega, diagnóstico, biblioteca, discussão e avaliação são normalizados para dimensões do score.
- Um único trigger em `eventing.events` é responsável pelo recálculo contínuo, inclusive para eventos comportamentais genéricos.
- O wrapper de extensões não executa um segundo recálculo.
- O recálculo filtra primeiro o participante afetado e usa índice composto por organização, ator e data.
- Falhas do score geram warning e nunca anulam a ação de aprendizagem.
- Backfill corrigiu snapshots anteriores.

**Estado:** definitivo. O pipeline é orientado a eventos, centralizado, idempotente na projeção e proporcional ao participante afetado.

## Contratos de regressão

As verificações permanentes cobrem:

- ausência de skeletons e indicador global único;
- salvamento administrativo sem captura de `NEXT_REDIRECT`;
- preview real e somente leitura;
- aula sem largura limitada, scroll aprisionado ou seletores de classes utilitárias;
- retorno da avaliação e navegação entre abas;
- títulos editoriais e remoção do diagnóstico duplicado;
- validação completa da configuração do score;
- consumo de eventos de domínio, trigger único e recálculo segmentado;
- fronteira e ordem das migrations.

## Fonte de verdade

- Código da aplicação: `apps/web`.
- Regras persistentes: migrations em `supabase/migrations`.
- Estado aplicado: `supabase_migrations.schema_migrations`.
- Evidência de compilação: deployment Vercel associado ao SHA.
- Evidência operacional: logs de runtime e consultas de integridade do Supabase.
