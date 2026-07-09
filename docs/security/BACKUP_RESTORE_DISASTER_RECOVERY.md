# Backup, restauração e recuperação de desastre

## Estado

O schema registra testes de restore, RPO, RTO, integridade, smoke test e verificação de objetos. Nenhuma prova de restore AWS foi executada; os controles permanecem bloqueados.

## Requisitos

### Banco
- backup automático e PITR conforme RPO aprovado;
- retenção suficiente para erro lógico e incidente tardio;
- cópia ou proteção contra exclusão pelo mesmo principal comprometido;
- restore em destino isolado;
- validação de migrations, constraints e contagens.

### Objetos
- versionamento e retenção separados do banco;
- inventário de bucket/prefixos;
- restauração de metadados e conteúdo;
- verificação de hash e associação com `file_objects`;
- proteção contra deleção em massa.

### Plataforma
- IaC versionada;
- recovery de secrets, filas, DNS e observabilidade;
- prioridades de serviço e dependências;
- teste full-platform periódico.

## Observação Supabase

O backup de banco do Supabase não restaura arquivos do Storage. O ambiente de teste precisa de procedimento externo se os objetos forem relevantes; isso não deve ser confundido com o plano AWS de produção.

## Evidência exigida

- política de RPO/RTO aprovada;
- configuração real de backup/PITR;
- relatório de restore com horário, duração e integridade;
- restore de objetos;
- smoke test da aplicação;
- ações corretivas e reteste.
