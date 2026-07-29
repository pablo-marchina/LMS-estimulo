# Especificação da Jornada OpenAI

**Revisado em:** 2026-07-29  
**Status:** capacidade técnica e configuração de desenvolvimento presentes; release editorial bloqueada

## Autoridade

A hierarquia está em [`SOURCE_AUTHORITY_HIERARCHY.md`](../product/SOURCE_AUTHORITY_HIERARCHY.md). Os materiais editoriais institucionais permanecem fora do Git e são a fonte para conteúdo final. Código, migrations, fixtures e seeds não substituem aprovação editorial.

## Identidade

| Campo | Valor |
|---|---|
| Programa | Capacitação de Crédito |
| Jornada | Capacitação em IA para MEI/ME — Estímulo e OpenAI |
| Público | MEIs e microempresas |
| Idioma | Português do Brasil |
| Modalidade | assíncrona, prática e modular |
| Ferramentas | ChatGPT e, na trilha avançada, Codex |
| Estado oficial | não aprovado para produção |

Pode existir uma versão publicada no ambiente de desenvolvimento/teste para validar o runtime. Ela não deve ser apresentada como conteúdo oficial.

## Estrutura esperada

```text
boas-vindas e potencial da IA
→ hub de trilhas
   ├── bloco base opcional
   ├── Marketing e Vendas com IA
   ├── Gestão com IA
   └── desenvolvimento avançado com Codex, conforme regra aprovada
```

A ordem, os gates e as credenciais são dados versionados. Não podem depender de UUIDs ou nomes hardcoded.

## Capacidades implementadas

- jornada, versão, trilhas, atividades e conteúdos;
- vídeo, texto, link e arquivo;
- quick checks, avaliações e tentativas;
- práticas, uploads, comentários e revisão;
- progresso e conclusão;
- pontos, conquistas, ranking, selos e certificados;
- administração;
- eventos e outbox.

Essas capacidades não comprovam que o pacote editorial ou as regras finais estão corretos.

## Padrão pedagógico

1. problema real;
2. exemplo guiado;
3. demonstração;
4. prática;
5. verificação rápida;
6. material complementar;
7. avaliação de utilidade.

Consumo de conteúdo, compreensão, aplicação e resultado de negócio são fatos distintos.

## Práticas e arquivos

Submissões registram participante, atividade e versões, tipo de entrega, metadados, autorização, estado de revisão e eventos. Arquivos são privados e validados por autorização, MIME, extensão, tamanho e SHA-256.

O scanner de malware não faz parte do produto atual.

Binários, URLs assinadas e textos abertos não são enviados ao HubSpot por padrão.

## Personalização

Arquétipo e contexto autorizado podem personalizar recomendações quando a metodologia estiver aprovada. Participantes sem diagnóstico veem conteúdo geral. Nenhum sinal educacional altera crédito automaticamente.

## Bloqueadores editoriais

- pacote de mídias e materiais;
- durações e ordem;
- avaliações, respostas e rubricas;
- progressão e critérios de conclusão;
- regras de pontos, selos e certificados;
- termos de upload e uso institucional;
- legendas, transcrições e equivalências;
- revisão de finanças, contratos, segurança e privacidade;
- acesso e instruções oficiais de ChatGPT/Codex.

## Gate de release

```text
editorial_sources_registered = pending
official_content_assets = pending
progression_approved = false
assessments_approved = false
practice_rules_approved = false
gamification_approved = false
credential_rules_approved = false
accessibility_assets_ready = false
real_participant_e2e_passed = false
aws_staging_passed = false
```
