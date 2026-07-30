# Segredos, criptografia e gestão de chaves

**Revisado em:** 2026-07-30  
**Estado:** requisitos definidos; mecanismo institucional de produção pendente

## Princípios

- valores de segredo nunca entram no Git, banco de aplicação, logs, tickets, documentos ou artefatos;
- código e migrations usam nomes lógicos ou referências, não valores;
- cada ambiente e finalidade possui material independente;
- privilégios seguem mínimo necessário e duração mínima;
- acesso humano é excepcional, auditado e revogável;
- rotação inclui verificação, rollback e revogação do material anterior;
- perda, exposição ou uso anômalo inicia resposta a incidente.

## Inventário

O inventário pode registrar somente metadados governados:

- nome lógico e finalidade;
- ambiente e escopo;
- proprietário e aprovadores;
- referência ao mecanismo aprovado;
- data de criação, rotação e expiração;
- dependências e procedimento de recuperação;
- classificação e requisitos de auditoria.

O inventário nunca contém o valor.

## Desenvolvimento, teste e preview

- `.env.example` contém apenas nomes e placeholders seguros;
- valores locais ficam fora do repositório;
- GitHub Actions usa segredos autorizados e minimizados;
- Edge Functions do Supabase de teste recebem somente valores necessários ao seu runtime;
- nenhuma chave de teste autoriza produção;
- funções, scheduler ou workers removidos não mantêm segredo operacional ativo;
- secret scanning do histórico é bloqueante.

## Proteção do CPF

- criptografia e lookup usam chaves independentes;
- material de teste é sintético e diferente de produção;
- CPF bruto não aparece em metadata, URL, evento ou log;
- custódia, rotação, recuperação, segregação e recriptografia de produção permanecem bloqueadores do Gate B;
- perda de uma chave não pode exigir exposição da outra.

## Requisitos do futuro ambiente AWS

A arquitetura aprovada deve definir, sem ser inferida deste documento:

- mecanismo de armazenamento e entrega de segredos;
- mecanismo de criptografia e gestão de chaves;
- identidade de workload e credenciais temporárias;
- separação entre ambientes, aplicações e operadores;
- políticas de acesso e aprovação;
- rotação automática ou assistida;
- auditoria, alertas e detecção de uso anômalo;
- recuperação, break-glass e revogação;
- disponibilidade e impacto de falha do mecanismo.

Nenhum serviço AWS específico é considerado decidido.

## Rotação

Uma rotação válida deve:

1. criar material novo pelo mecanismo aprovado;
2. conceder acesso mínimo aos consumidores necessários;
3. atualizar consumidores sem incorporar valores ao artefato;
4. validar leitura, escrita e decrypt/encrypt conforme a finalidade;
5. monitorar erros e uso do material antigo;
6. revogar o anterior dentro da janela aprovada;
7. registrar evidência e atualizar o inventário;
8. possuir rollback seguro enquanto a revogação não ocorreu.

## Gate B

Antes de produção, devem ser exercitados:

- provisionamento e injeção sem exposição;
- rotação normal e emergencial;
- revogação de credencial comprometida;
- recuperação e break-glass;
- indisponibilidade do mecanismo;
- acesso não autorizado e alerta;
- recriptografia ou migração de material, quando aplicável;
- isolamento entre ambientes;
- revisão periódica de privilégios;
- prova de criptografia em trânsito e repouso.

Ausência de evidência mantém produção bloqueada.
