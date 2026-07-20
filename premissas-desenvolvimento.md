# Premissas de desenvolvimento — versão sanitizada

> Esta é a cópia canônica versionável das premissas fornecidas pela Estímulo. Valores operacionais e credenciais foram removidos. A sanitização não altera requisitos de produto. Credenciais compartilhadas em texto devem ser consideradas comprometidas, rotacionadas externamente e mantidas apenas em secret manager ou configuração segura por ambiente.

Ao desenvolver, pesquise e siga as melhores práticas de desenvolvimento de aplicação web e LMS

A entrega final deve ser uma plataforma web LMS em produção/deploy em estado final com todas as features que a estimulo quer feitas

Esse projeto será todo desenvolvido internamente, não existe a possibilidade de delegar/comprar algum serviço.

github onde está sendo desenvolvido:  
[https://github.com/pablo-marchina/LMS-estimulo.git](https://github.com/pablo-marchina/LMS-estimulo.git)  
na aba issues tem features que devem serm implementadas, sempre verificar

para a entrega final e produção/deploy usaremos a AWS, mas para desenvolvimento e testes usaremos esse supabase:  
[URL DO SUPABASE DE DESENVOLVIMENTO REMOVIDA — configurar por variável de ambiente segura]
[CHAVE PUBLICÁVEL DO SUPABASE REMOVIDA — obter pela configuração autorizada do ambiente de desenvolvimento]
[CONEXÃO DE BANCO REMOVIDA — credencial comprometida; rotacionar e usar secret manager]
[CHAVE SECRETA DO SUPABASE REMOVIDA — credencial comprometida; rotacionar e usar secret manager]

Pesquise e siga as melhores práticas de manutenção do github, Um dos pontos de máxima atenção do projeto deve ser a questão do legado do código, ele deve ter uma arquiterura e seguir uma estrutura clara e estruturada, aplicar padrões de projeto onde possível para manter uma consistência no projeto, sempre bem aplicados e mantidos, junto com a documentação, que deve ser estar sempre bem detalhada e refletir o estado atual do projeto, isso serve para o github como um todo, sempre utilizar as melhores práticas de manutenção

A plataforma tem como objetivo capturar o máximo de dados sobre o usuário para usá lo posteriormente, ou seja, todas as ações do usuário na plataforma devem ser armazenadas como dados

Todos os dados capturados ou usados devem estar no hubspot, ele será o centro de todas as informações do usuário

Reutilizar o máximo de código possível do [https://github.com/denilsontorres2024/plataforma-estimulo.git](https://github.com/denilsontorres2024/plataforma-estimulo.git)

Tela de login:  
clientes com crédito precisam ser identificados no login e serem atribuídos ao mesmo id que já possuem hubspot 

os clientes sem crédito precisam ser identificados pois eles não vão ter id no hubspot, então todas as informações do login precisam ser coletadas e criar um novo usuário com todas essas informações no hubspot de forma que caso ele faça o crédito depois ele todas as informações do crédito devem ir para o mesmo id

o login tem que pedir as seguintes informações: nome, email, cpf, cnpj(opcional), telefone

recolher UTM na página de login

Pesquise e siga as melhores práticas de desenvolvimento de interface de usuário

Plataforma:   
A plataforma precisa seguir o guia de estilo da estimulo, e com base os mockups feito na lovable, [https://estimulo-hub.lovable.app/](https://estimulo-hub.lovable.app/)  ,ela terá uma interface do usuario e outra para os administradores da estímulo

No primeiro login do usuário ele deverá responder um formulário para definir qual será o seu arquétipo, as perguntas, o arquétipos do resultado e como é calculado o resultado devem ser editados para possível alteração futura, ele não é obrigatório, queremos que o formulário esteja em typeform, precisamos pensar em uma solução

Telas interface usuário:  
\*As trilhas devem ter labels, uma das labels deverá dizer para quais usuários ele está disponível dependendo do arquétipo do usuário, caso ele não tenha feito o formulário, só apareceram as trilhas que não tem label que define arquétipo.  
\*\*Abaixo estão elementos que as telas devem ter, esses são os obrigatórios, mas elas podem ter mais

Home page: Painel carrossel para anúncios, visualizar somente as trilhas para aquele tipo de usuário, continuar de onde parei com barra de progresso, menu em cima, o que você pode ganhar de recompensas 

Trilhas: visualização das trilhas que o usuário pode fazer, 

Na trilha: as atividades do bloco da trilha não precisam serem feitas em ordem, mas é necessário ter 100 de progresso para liberar selo e certificados, visualização por blocos expansíveis, colocar descrição/labels de cada bloco

Atividades: comentários, avaliação de 5 estrela pra aula, sessão com pergunta curta para verificar aprendizagem da atividade de forma rápida, visualização de diferentes formas de conteúdo na visualização na forma correta, suporte para conteúdos internos e externos de todos os tipos

Perfil: certificados, resultado do formulário, histórico de engajamento

Engajamento: conquistas, o que você pode ganhar, histórico de pontuação, ranking

Telas interface administrador:  
\*Será logada usando o email do estímulo

Usuários: tela para manejar os usuários da plataforma

trilhas: tela para controlar todos o elementos que constituem a trilha

Biblioteca de conteúdo: área com todos os conteúdos para serem usados nas trilhas, a biblioteca deve ter labels para organização
