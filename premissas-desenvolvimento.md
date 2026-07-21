# Premissas de desenvolvimento

> Documento canônico de requisitos do produto. Credenciais e valores operacionais não pertencem ao repositório e devem permanecer em configuração segura por ambiente.

## Entrega e engenharia

- Entregar uma plataforma web LMS completa, implantada em produção e com todas as funcionalidades aprovadas pela Estímulo.
- Desenvolver e manter internamente o produto, o código, a arquitetura, os dados e as regras de negócio.
- Usar Supabase somente em desenvolvimento e testes; staging e produção usam AWS.
- Manter arquitetura clara, legado contido, documentação operacional atualizada, testes proporcionais e boas práticas de GitHub.
- Reutilizar ao máximo capacidades, fluxos e experiências existentes que atendam ao produto, preferindo integração ou adaptação segura a reconstrução parcial.
- Registrar ações relevantes do usuário como eventos estruturados, versionados e auditáveis.

## HubSpot

O PostgreSQL é o banco operacional e preserva o histórico detalhado. O HubSpot recebe somente itens explicitamente aprovados nas classes:

```text
linking_identifier
engagement_signal
calculation_input_or_result
```

Todo o restante é `not_synced`. Não sincronizar conteúdo integral, estado transacional detalhado, payloads brutos sem finalidade aprovada, arquivos, URLs assinadas, logs, filas, retries, segredos ou credenciais.

Nenhum dado educacional ou comportamental pode influenciar crédito sem validação metodológica, revisão de equidade, governança humana e aprovação jurídica e de privacidade.

## Identidade e entrada

- Identificar clientes com crédito e vinculá-los ao mesmo registro autorizado no HubSpot.
- Identificar clientes sem crédito sem criar duplicidade; caso obtenham crédito posteriormente, preservar o mesmo vínculo.
- Capturar nome, e-mail, CPF, telefone, CNPJ opcional e UTM no fluxo de entrada/cadastro.
- CPF é obrigatório, deve ter dígitos verificadores validados, ser cifrado no servidor e possuir somente um token HMAC para busca e deduplicação. O valor bruto não pode aparecer em metadata, URL, logs ou eventos.
- O acesso à área administrativa exige e-mail confirmado no domínio exato `@estimulo.org` e papel RBAC ativo. O domínio habilita a entrada administrativa, mas não concede permissões por si só.

## Diagnóstico e personalização

- No primeiro acesso, oferecer formulário opcional para definição de arquétipo.
- Perguntas, opções, cálculo, resultados e ativações devem ser editáveis, versionados e publicáveis sem mudança de código.
- Trilhas devem possuir labels de elegibilidade por arquétipo.
- Participantes sem diagnóstico veem somente trilhas gerais, sem restrição de arquétipo.

## Experiência do participante

### Home

- carrossel de anúncios;
- trilhas elegíveis para o participante;
- retomada do ponto onde parou;
- barra de progresso;
- navegação superior;
- apresentação das recompensas possíveis.

### Trilhas e atividades

- visualização das trilhas disponíveis;
- blocos expansíveis com descrição e labels;
- atividades do bloco acessíveis fora de ordem quando a regra permitir;
- 100% dos requisitos para liberar selo e certificado;
- comentários por atividade;
- avaliação de utilidade em cinco estrelas;
- quick check de aprendizagem;
- conteúdos internos e externos nos formatos adequados;
- suporte a vídeos horizontais e verticais, textos, arquivos, links, avaliações e práticas.

### Perfil e engajamento

- certificados e selos;
- resultado do diagnóstico;
- histórico de engajamento;
- conquistas e recompensas;
- histórico de pontuação;
- ranking governado.

## Experiência administrativa

- autenticação por e-mail Estímulo confirmado e autorização RBAC;
- gestão de usuários e papéis;
- gestão integral de jornadas, trilhas, blocos, atividades, labels e regras;
- gestão do diagnóstico e das ativações;
- biblioteca de conteúdo com labels e taxonomia;
- gestão de anúncios, gamificação, recompensas e relatórios;
- moderação de comentários e revisão de práticas;
- auditoria das ações administrativas.

## Interface

- Seguir o guia de estilo oficial da Estímulo e manter experiência responsiva e acessível.
- Preservar interfaces distintas e coerentes para participantes e equipe administrativa.
