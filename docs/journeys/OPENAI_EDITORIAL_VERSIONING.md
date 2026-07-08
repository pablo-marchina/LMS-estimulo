# Versionamento editorial - Jornada OpenAI

**Versão:** 0.1  
**Status:** Proposta operacional

## 1. Objetivo

Permitir evolução de conteúdo, avaliações e regras sem alterar silenciosamente a experiência ou as evidências de participantes existentes.

## 2. Objetos versionados

- versão da jornada;
- trilhas e grafo de progressão incluídos no snapshot da jornada;
- cursos e módulos;
- atividades/unidades;
- ativos de conteúdo;
- avaliações;
- questões e rubricas;
- regras de conclusão;
- regras de pontos;
- selos;
- certificados;
- textos jurídicos e consentimentos aplicáveis.

## 3. Ciclo editorial

`draft -> in_review -> approved -> scheduled -> published -> deprecated -> archived`

- `draft`: editável.
- `in_review`: bloqueado para edição não controlada.
- `approved`: conteúdo e regras aprovados, aguardando publicação.
- `scheduled`: publicação futura programada.
- `published`: snapshot imutável e disponível.
- `deprecated`: não recebe novas participações, mas continua servindo participantes existentes.
- `archived`: preservado para auditoria, sem acesso normal.

## 4. Política de alteração

### Alteração sem nova versão estrutural

Somente correções que não mudam significado, evidência, duração, ordem, requisito ou interpretação, por exemplo metadados administrativos ou correção puramente visual sem efeito no conteúdo. Mesmo essas alterações devem ser auditadas.

### Nova versão de atividade

Obrigatória quando houver mudança em:

- conteúdo substantivo;
- ativo principal;
- objetivo ou competência;
- avaliação rápida;
- critério de conclusão;
- duração relevante;
- instrução de prática;
- risco ou aviso de segurança.

### Nova versão da jornada

Obrigatória quando houver mudança em:

- grafo de progressão;
- obrigatoriedade;
- pré-requisitos;
- critérios de selo/certificado;
- avaliação final;
- política de atribuição;
- composição de trilhas;
- significado da conclusão.

## 5. Participantes em andamento

Uma participação permanece na versão publicada originalmente atribuída. As opções de atualização são:

1. permanecer na versão atual;
2. migração opcional com consentimento/explicação;
3. migração obrigatória por segurança ou conformidade, com plano específico;
4. encerramento e nova participação.

Toda migração deve registrar origem, destino, mapeamento de progresso, justificativa e efeitos sobre credenciais.

## 6. Checklist de publicação

### Conteúdo

- ativos finais presentes;
- licenças e atribuições válidas;
- links testados;
- duração revisada;
- transcrição e legenda;
- texto alternativo e acessibilidade;
- compatibilidade mobile;
- revisão de linguagem.

### Pedagogia

- objetivo e competência;
- atividade prática;
- quick check;
- respostas e feedback;
- rubrica;
- pré-requisitos;
- critério de conclusão.

### Produto e dados

- identificadores estáveis;
- eventos esperados;
- regras estruturadas válidas;
- pontos/selos/certificados;
- analytics sem dados pessoais desnecessários;
- testes de fluxo.

### Segurança e governança

- avisos de uso de IA;
- revisão financeira/jurídica quando aplicável;
- proteção de uploads;
- termos e consentimentos;
- política de retenção;
- revisão de permissões.

## 7. Duração e cálculos derivados

A duração total será calculada a partir das atividades da versão publicada. O sistema pode manter uma duração editorial estimada, mas deve sinalizar divergência com a soma dos filhos.

## 8. Política para ferramentas mutáveis

A interface e as capacidades de ChatGPT/Codex podem mudar. Cada unidade deve registrar:

- data de revisão técnica;
- produto e superfície demonstrados;
- plano/nível de acesso assumido;
- screenshots ou passos suscetíveis a mudança;
- data de próxima revisão;
- aviso quando a experiência real puder diferir.

## 9. Critérios de descontinuação

Uma versão pode deixar de receber participantes por:

- conteúdo desatualizado;
- risco de segurança ou privacidade;
- mudança relevante da ferramenta;
- avaliação inválida;
- ativo indisponível;
- mudança estratégica;
- substituição por versão posterior.
