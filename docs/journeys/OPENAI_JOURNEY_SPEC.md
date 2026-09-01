# Especificação da Jornada OpenAI

**Revisado em:** 2026-09-01  
**Status:** capacidade técnica implementada; aprovação editorial para produção institucional continua separada

## Fonte editorial

Materiais institucionais aprovados permanecem fora do Git quando aplicável. Código, migrations e conteúdo de desenvolvimento não substituem aprovação editorial.

## Identidade

| Campo | Valor |
|---|---|
| Programa | Capacitação de Crédito |
| Jornada | Capacitação em IA para MEI/ME — Estímulo e OpenAI |
| Público | MEIs e microempresas |
| Idioma | Português do Brasil |
| Modalidade | assíncrona, prática e modular |
| Ferramentas | ChatGPT e Codex quando a trilha avançada for aprovada |

## Lifecycle

A jornada segue o contrato único `draft ↔ published`. O registro publicado pode ser editado ao vivo; publicação não cria versão editorial paralela. Configurações de diagnóstico, avaliação, documentos ou credenciais preservam seus próprios snapshots quando exigido.

## Estrutura editorial esperada

```text
boas-vindas
→ hub de trilhas
   ├─ base opcional
   ├─ Marketing e Vendas com IA
   ├─ Gestão com IA
   └─ Codex avançado, conforme regra aprovada
```

Ordem, gates, avaliações e credenciais são configuração administrada; não dependem de UUID/slug hardcoded no núcleo.

## Capacidades técnicas

- jornada/trilhas/aulas/conteúdos;
- vídeo, texto, link e arquivo;
- quick checks e avaliações;
- práticas/uploads/comentários/revisão;
- progressão/conclusão;
- pontos, ranking, badges, recompensas e certificados;
- administração, eventos e outbox.

`multiple_choice` exige conjunto exato. Ranking mascara identificação. Popup de badge só anuncia award novo.

## Personalização

O diagnóstico principal pode personalizar a experiência conforme configuração aprovada. O runtime corrige a execução de thresholds, mas não cria metodologia oficial. Participante sem resultado aplicável recebe caminho seguro/geral. Nenhum sinal educacional decide crédito.

## Integração

Eventos/outbox são a fronteira para qualquer destino externo. Conteúdo de prática, binários e URLs assinadas não são projetados para CRM por padrão.

## Bloqueadores editoriais possíveis

- pacote final de mídias/materiais;
- durações/ordem;
- avaliações/respostas/rubricas;
- critérios oficiais de conclusão;
- regras finais de pontos/badges/certificados;
- direitos, acessibilidade e aprovações institucionais.

A existência do runtime ou de uma jornada publicada em desenvolvimento não prova aprovação editorial para produção.