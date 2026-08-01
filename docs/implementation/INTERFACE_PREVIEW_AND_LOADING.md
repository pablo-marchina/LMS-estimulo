# Preview de interface e feedback de carregamento

**Revisado em:** 2026-08-01  
**Status:** implementação vigente

## Preview administrativo

A área `/admin/experiencia` permite selecionar telas de administrador e participante.

Telas administrativas podem ser abertas diretamente no iframe com `interface_preview=1`. Telas de participante usam `/interface-preview/participant`, porque a autenticação participante normal redireciona identidades administrativas e impediria a prévia.

A rota de preview participante:

- exige sessão administrativa `@estimulo.org`;
- renderiza estados representativos das páginas selecionadas;
- não cria matrícula ou instância de jornada;
- não monta o rastreador de eventos comportamentais;
- não grava progresso, score, respostas, entregas ou analytics;
- usa `InterfacePreviewBridge` para selecionar elementos editáveis;
- usa iframe com sandbox e bloqueio de escritas.

O preview valida estrutura, textos e composição visual. Ele não substitui teste E2E autenticado da experiência real.

## Carregamento

A plataforma usa uma barra global no topo:

- inicia em links internos, formulários e navegação de histórico;
- progride de forma indeterminada até a mudança de rota;
- conclui em 100% quando a nova rota é resolvida;
- possui timeout de segurança;
- respeita preferência de redução de movimento.

`app/loading.tsx` mostra somente a barra no carregamento inicial. Skeletons de página e o antigo indicador exclusivo do participante foram removidos para evitar duas experiências concorrentes.
