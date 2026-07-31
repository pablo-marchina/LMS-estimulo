# Suíte de crescimento, engajamento e extensões

**Status:** implementada no código versionado e no banco de desenvolvimento conectado  
**Escopo:** administração, aquisição, biblioteca, jornadas, avaliações, recompensas, B2B, eventos e exportação futura

## Princípios

- PostgreSQL é a fonte operacional e histórica.
- Integrações externas futuras consomem uma outbox genérica; nenhum CRM é dependência do produto.
- Operações financeiras de pontos, estoque, publicação e acesso são transacionais e idempotentes.
- Diagnósticos opcionais não alteram arquétipo nem elegibilidade de jornadas.
- O score comportamental é exclusivamente analítico e não interfere na experiência do participante.
- A captura comportamental começa na implantação desta suíte; não existe reconstrução de eventos antigos.

## Configurações gerais e documentos legais

A área **Mais configurações** concentra identidade da plataforma, telefone, WhatsApp, e-mail e horário de suporte, links institucionais e rodapé. Termos de Uso e Política de Privacidade possuem versões em rascunho, publicada ou retirada. Uma publicação pode exigir nova aceitação, preservando usuário, versão e data.

## Temas

Temas são entidades administradas e podem ser associados em conjunto a conteúdos da biblioteca e jornadas. A exclusão é bloqueada enquanto houver uso. Formulários de produto usam os identificadores administrados, evitando taxonomia livre divergente.

## Certificados

Templates aceitam imagem ou PDF e são registrados como arquivos verificados. A resolução segue a precedência:

1. jornada;
2. programa;
3. configuração global.

A ausência de template específico preserva o fallback da camada imediatamente superior.

## Aquisição e UTM

Links públicos rastreáveis configuram UTMs, parâmetros adicionais, público, validade, limite de uso, destino pós-login e etapas que podem ser puladas. Cada visita recebe token não reutilizável, metadados de sessão e dispositivo, primeiro e último toque, associação ao cadastro e conversão quando aplicável.

O redirecionamento nunca substitui autorização: rotas administrativas, B2B e conteúdos restritos continuam validados no servidor.

## B2B

Administradores criam páginas por blocos, publicam versões e concedem acesso diretamente a usuários ou grupos. Participantes sem autorização não recebem a página na consulta e não conseguem acessá-la por URL direta.

## Recompensas

Pontos de engajamento podem ser convertidos para uma carteira de recompensas. A taxa inicial é 1:1 e fica versionada pela movimentação. O catálogo suporta recompensas físicas, digitais, experiências e serviços, com estoque, limite por usuário, período, regulamento e configuração de entrega.

Resgates debitam saldo e estoque na mesma transação. Cancelamentos administrativos devolvem pontos e restauram estoque, preservando o motivo e o livro-razão.

## Entregas e correção por IA

Entregas podem pertencer a uma atividade ou a um conteúdo publicado somente na biblioteca. Configurações controlam formatos, arquivos, tamanho, prazo, atraso, tentativas, reenvio, estratégia de nota, rubrica, referências, instruções de IA e pontos.

A correção possui três modos:

- automática, quando confiança e regras permitem publicação direta;
- IA com aprovação humana;
- IA como assistente, com decisão humana final.

Arquivos de código e ZIP nunca são executados. Texto extraído, análise estática e metadados seguros são enviados ao avaliador. Evidência insuficiente ou indisponibilidade do provedor encaminha a entrega para revisão humana.

## Diagnósticos

O diagnóstico principal mantém responsabilidade exclusiva sobre arquétipo e elegibilidade de jornadas. Diagnósticos opcionais aparecem no Perfil conforme público e período, guardam tentativas e resultados próprios e nunca atualizam atribuições de arquétipo.

Perguntas, dimensões, opções e perfis do diagnóstico são configuráveis em rascunho. Alterações estruturais exigem nova publicação, preservando respostas históricas.

## Eventos e score comportamental

Interações relevantes geram `behavior.interaction.recorded` com versão de schema, usuário, sessão, entidade, horário e propriedades. Chaves idempotentes impedem repetição divergente.

O score multidimensional consolida engajamento, consistência, profundidade, conclusão, autonomia, qualidade, evolução e frequência de retorno. Snapshots registram versão do modelo, confiança, cobertura e hash dos inputs. O uso permitido é análise administrativa, relatório e ETL. Acesso, recomendações, jornadas, recompensas, avisos e navegação são usos proibidos.

## ETL genérico

Produtores persistem estado, evento e outbox sem conhecer o destino externo. Um consumidor futuro poderá exportar por cursor e idempotência, com retry, dead letter e reconciliação. A troca de destino não exige alterar fluxos transacionais do LMS.

## Operação

As funções públicas de comando são `SECURITY DEFINER`, com `search_path` fechado, validação de ator, organização, permissão e idempotência. As tabelas da suíte não são expostas diretamente pela Data API. O frontend acessa RPCs por Edge Functions autenticadas.

## Configuração de IA

A correção automática exige segredo de provedor e modelo no ambiente da Edge Function. Sem configuração válida, o sistema preserva a entrega e cria avaliação de baixa confiança para revisão humana, sem bloquear o participante nem inventar nota.
