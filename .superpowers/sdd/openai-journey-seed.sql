-- Tasks 7-9: transactional seed for the OpenAI demo journey.
--
-- IMPORTANT PROVENANCE NOTE
-- The three facilitator-script .docx.md files referenced by the implementation plan
-- were not present in the branch or retrievable from the available file library.
-- This seed therefore reconstructs the promised structure and creates explicitly
-- marked editorial drafts from the approved plan, OPENAI_JOURNEY_SPEC and competency
-- model. It does not claim that reconstructed prompts/distractors are verbatim source.
-- No passing score or attempt limit is invented.

do $seed$
declare
  v_actor constant uuid := '577f49e5-9b1f-4eee-b551-b2546d513190'::uuid;
  v_org constant uuid := '427d7ce5-c341-54cf-a3a2-c2936e4a0a27'::uuid;
  v_program_id uuid;
  v_journey_definition_id uuid;
  v_journey_version_id uuid;
  v_path_id uuid;
  v_activity_version_id uuid;
  v_rule_version_id uuid;
  v_result jsonb;
  v_path jsonb;
  v_lesson jsonb;
  v_configuration jsonb;
  v_activity_payload jsonb;
  v_content_hash text;
  v_paths jsonb := $json$
[
  {
    "code":"marketing_vendas_ia",
    "name":"Marketing e Vendas com IA",
    "position":1,
    "description":"Rascunho editorial — Esta trilha transforma um caso de uso de um pequeno negócio em uma sequência prática de marketing e vendas com IA: planejar uma campanha, produzir materiais, revisar resultados e continuar a conversa comercial.",
    "badge":{"code":"selo_marketing_vendas_ia","title":"Selo Marketing e Vendas com IA","description":"Reconhece a conclusão da trilha de planejamento de campanha, produção de conteúdo e conversa comercial com apoio de IA."},
    "lessons":[
      {
        "code":"marketing_aula_1",
        "title":"Aula 1 — Introdução da trilha e caso de uso",
        "minutes":5,
        "description":"Rascunho — pendente de revisão. Você acompanhará o caso de uma pequena empresa de alimentos que quer atrair mais clientes e precisa publicar com maior frequência. Primeiro criará uma campanha; depois usará o mesmo contexto para estruturar a conversa de vendas.",
        "prompts":[],
        "questions":[{"code":"pergunta_1","prompt":"Qual é o objetivo do caso de uso desta trilha?","position":1,"options":[{"code":"opcao_1","label":"Criar uma mini campanha para atrair clientes e continuar a conversa com um script de vendas.","is_correct":true,"position":1},{"code":"opcao_2","label":"Aprender a editar imagens no computador sem relação com vendas.","is_correct":false,"position":2},{"code":"opcao_3","label":"Configurar uma conta de anúncios pagos como única atividade.","is_correct":false,"position":3}]}],
        "checklist":[]
      },
      {
        "code":"marketing_aula_2",
        "title":"Aula 2 — Mão na massa: marketing com IA",
        "minutes":15,
        "description":"Rascunho — pendente de revisão. Construa a campanha em etapas: direção visual, calendário de publicações, imagem, legenda, apresentação de produto físico e revisão final. Trabalhar em sequência facilita a conferência e a melhoria de cada resultado.",
        "prompts":[
          {"title":"Direção de identidade visual","text":"Atue como especialista em identidade visual para pequenos negócios. Meu negócio é [tipo de negócio], atende [público] e quer transmitir [valores]. Sugira uma direção visual simples com cores, estilo de imagens e elementos que eu consiga aplicar nas redes sociais."},
          {"title":"Calendário de publicações","text":"Crie um calendário de publicações para 7 dias para [negócio] com objetivo de [objetivo]. Para cada dia, indique tema, formato, mensagem principal e chamada para ação. Use linguagem simples e adequada a [público]."},
          {"title":"Descrição para gerar imagem","text":"Crie uma descrição detalhada para gerar uma imagem de divulgação de [produto ou serviço], mostrando [contexto], com estilo [estilo], cores [cores], formato [formato] e sem inserir textos ilegíveis."},
          {"title":"Legendas de divulgação","text":"Escreva 3 versões de legenda para divulgar [produto ou serviço] para [público]. Inclua benefício principal, detalhe concreto e chamada para ação. Evite promessas exageradas."},
          {"title":"Apresentação de produto físico","text":"Adapte a campanha para o produto físico [produto]. Sugira foto principal, cenário, ângulo, elementos de apoio e uma legenda que destaque [diferencial]."},
          {"title":"Revisão da peça","text":"Revise esta peça de divulgação: [cole o texto ou descreva a imagem]. Aponte o que está confuso, o que pode ficar mais específico e entregue uma versão melhorada, mantendo o tom [tom]."}
        ],
        "questions":[{"code":"pergunta_1","prompt":"Por que usar uma sequência de prompts em vez de pedir tudo de uma vez?","position":1,"options":[{"code":"opcao_1","label":"Para revisar cada etapa, manter o contexto e melhorar o resultado antes de avançar.","is_correct":true,"position":1},{"code":"opcao_2","label":"Porque a IA só consegue responder a uma frase por dia.","is_correct":false,"position":2},{"code":"opcao_3","label":"Para evitar informar o objetivo e o público do negócio.","is_correct":false,"position":3}]}],
        "checklist":[]
      },
      {
        "code":"marketing_aula_3",
        "title":"Aula 3 — Mão na massa: vendas com IA",
        "minutes":10,
        "description":"Rascunho — pendente de revisão. Reaproveite o contexto da campanha para organizar o atendimento: entenda a necessidade, apresente uma recomendação, responda objeções, proponha o próximo passo e prepare mensagens de acompanhamento.",
        "prompts":[
          {"title":"Roteiro de atendimento","text":"Crie um roteiro de atendimento para vender [produto ou serviço] por WhatsApp. Considere cliente [perfil], necessidade [necessidade] e diferencial [diferencial]. Estruture abertura, perguntas, recomendação, tratamento de objeção e fechamento."},
          {"title":"Proposta comercial simples","text":"Transforme estas informações em uma proposta comercial simples: [contexto, solução, itens, prazo e valor]. Organize em objetivo, solução proposta, escopo, condições e próximo passo. Não invente dados ausentes."},
          {"title":"Acompanhamento de venda","text":"Crie três mensagens curtas de acompanhamento para um cliente que recebeu a proposta: uma para o dia seguinte, uma para esclarecer dúvidas e uma para encerrar o contato com respeito, sem pressão excessiva."}
        ],
        "questions":[{"code":"pergunta_1","prompt":"Qual é a função do script de vendas nesta trilha?","position":1,"options":[{"code":"opcao_1","label":"Guiar uma conversa organizada desde a necessidade do cliente até o próximo passo da venda.","is_correct":true,"position":1},{"code":"opcao_2","label":"Substituir qualquer conversa humana por uma resposta automática fixa.","is_correct":false,"position":2},{"code":"opcao_3","label":"Garantir que toda proposta seja aceita.","is_correct":false,"position":3}]}],
        "checklist":[]
      },
      {
        "code":"marketing_aula_4",
        "title":"Aula 4 — Fechamento e avaliação",
        "minutes":6,
        "description":"Rascunho — pendente de revisão. Revise a campanha e o roteiro de vendas, confira se o conteúdo representa o negócio e registre uma versão que possa ser testada com clientes reais. A IA apoia o processo; você continua responsável por verificar e adaptar a saída.",
        "prompts":[],
        "questions":[
          {"code":"pergunta_1","prompt":"O que deve orientar a criação de uma campanha com IA?","position":1,"options":[{"code":"opcao_1","label":"Um objetivo comercial, o público e o contexto real do negócio.","is_correct":true,"position":1},{"code":"opcao_2","label":"A primeira tendência encontrada, mesmo sem relação com o cliente.","is_correct":false,"position":2},{"code":"opcao_3","label":"Somente a quantidade de texto produzido.","is_correct":false,"position":3}]},
          {"code":"pergunta_2","prompt":"Qual é uma boa forma de melhorar uma saída da IA?","position":2,"options":[{"code":"opcao_1","label":"Apontar o que precisa mudar e pedir uma nova versão com critérios específicos.","is_correct":true,"position":1},{"code":"opcao_2","label":"Publicar a primeira resposta sem ler.","is_correct":false,"position":2},{"code":"opcao_3","label":"Remover todas as informações do negócio.","is_correct":false,"position":3}]},
          {"code":"pergunta_3","prompt":"O que um roteiro de vendas deve fazer?","position":3,"options":[{"code":"opcao_1","label":"Ajudar a ouvir, explicar valor, tratar dúvidas e combinar o próximo passo.","is_correct":true,"position":1},{"code":"opcao_2","label":"Pressionar o cliente até ele responder.","is_correct":false,"position":2},{"code":"opcao_3","label":"Prometer resultados que o negócio não pode garantir.","is_correct":false,"position":3}]},
          {"code":"pergunta_4","prompt":"Antes de usar uma peça criada com IA, o que é necessário?","position":4,"options":[{"code":"opcao_1","label":"Revisar informações, linguagem, imagens e adequação ao público.","is_correct":true,"position":1},{"code":"opcao_2","label":"Ocultar que existem informações ainda não verificadas.","is_correct":false,"position":2},{"code":"opcao_3","label":"Usar dados pessoais de clientes sem autorização.","is_correct":false,"position":3}]},
          {"code":"pergunta_5","prompt":"Qual resultado demonstra melhor a aplicação da trilha?","position":5,"options":[{"code":"opcao_1","label":"Uma campanha e um roteiro adaptados ao próprio negócio, revisados e prontos para teste.","is_correct":true,"position":1},{"code":"opcao_2","label":"Uma lista genérica de ideias sem relação com o negócio.","is_correct":false,"position":2},{"code":"opcao_3","label":"Apenas abrir a ferramenta de IA.","is_correct":false,"position":3}]}
        ],
        "checklist":["Defini o objetivo da campanha.","Descrevi o público que quero alcançar.","Criei um calendário ou sequência de publicações.","Produzi pelo menos uma peça, imagem ou legenda.","Revisei informações e promessas antes de usar.","Criei um roteiro de atendimento ou vendas.","Incluí perguntas para entender a necessidade do cliente.","Preparei um próximo passo ou mensagem de acompanhamento.","Registrei o prompt e a versão final adaptada ao negócio."]
      }
    ]
  },
  {
    "code":"gestao_ia",
    "name":"Gestão com IA",
    "position":2,
    "description":"Rascunho editorial — Esta trilha usa IA para organizar informações financeiras e operacionais, estruturar rotinas, melhorar propostas e fazer uma leitura inicial de documentos que sempre exige verificação humana.",
    "badge":{"code":"selo_gestao_ia","title":"Selo Gestão com IA","description":"Reconhece a conclusão da trilha de organização financeira, rotinas operacionais e análise assistida com limites de segurança."},
    "lessons":[
      {
        "code":"gestao_aula_1",
        "title":"Aula 1 — Caso de uso: central de gestão com IA",
        "minutes":5,
        "description":"Rascunho — pendente de revisão. Você criará uma central simples para reunir anotações financeiras, comprovantes, rotinas e documentos do negócio. O objetivo é organizar informações para decidir melhor, sem substituir contabilidade, assessoria jurídica ou conferência humana.",
        "prompts":[],
        "questions":[{"code":"pergunta_1","prompt":"Qual é o objetivo da central de gestão com IA?","position":1,"options":[{"code":"opcao_1","label":"Organizar informações do negócio e apoiar análises que serão conferidas por uma pessoa.","is_correct":true,"position":1},{"code":"opcao_2","label":"Substituir automaticamente o contador e o advogado.","is_correct":false,"position":2},{"code":"opcao_3","label":"Tomar decisões financeiras sem olhar os dados originais.","is_correct":false,"position":3}]}],
        "checklist":[]
      },
      {
        "code":"gestao_aula_2",
        "title":"Aula 2 — Mão na massa: assistente financeiro em Projetos",
        "minutes":15,
        "description":"Rascunho — pendente de revisão. Estruture um projeto de gestão, converta anotações em registros organizados, centralize comprovantes e peça uma análise inicial de gastos. Use dados fictícios ou previamente anonimizados e confira cada valor na fonte original.",
        "prompts":[
          {"title":"Projeto de gestão","text":"Quero criar um projeto para organizar a gestão financeira do meu negócio [tipo de negócio]. Proponha uma estrutura simples com instruções de uso, categorias de receitas e despesas, rotina semanal e perguntas que você deve fazer quando faltar informação."},
          {"title":"Extrair anotação financeira","text":"Transforme esta anotação em um registro financeiro estruturado: [anotação sem dados pessoais]. Retorne data, tipo de movimentação, categoria, descrição, valor, forma de pagamento e campo de conferência. Marque qualquer informação ausente ou incerta."},
          {"title":"Centralizar comprovantes","text":"Crie um padrão para registrar comprovantes do negócio. Para cada item, quero data, fornecedor ou cliente anonimizado, categoria, valor, meio de pagamento, arquivo de referência e status de conferência. Não invente dados que não aparecem no documento."},
          {"title":"Análise inicial de gastos","text":"Analise esta lista de gastos fictícios ou anonimizados: [dados]. Agrupe por categoria, destaque variações e itens que merecem conferência e proponha perguntas para investigar. Não dê aconselhamento contábil ou financeiro conclusivo."}
        ],
        "questions":[{"code":"pergunta_1","prompt":"Por que os valores extraídos pela IA precisam ser conferidos?","position":1,"options":[{"code":"opcao_1","label":"Porque a IA pode interpretar ou copiar dados incorretamente e o documento original continua sendo a referência.","is_correct":true,"position":1},{"code":"opcao_2","label":"Porque nenhum registro financeiro pode ser organizado digitalmente.","is_correct":false,"position":2},{"code":"opcao_3","label":"Somente para aumentar o tamanho da planilha.","is_correct":false,"position":3}]}],
        "checklist":[]
      },
      {
        "code":"gestao_aula_3",
        "title":"Aula 3 — Mão na massa: checklist operacional",
        "minutes":5,
        "description":"Rascunho — pendente de revisão. Transforme uma rotina recorrente em passos claros, depois adapte o checklist por função e acrescente detalhes reais do seu negócio.",
        "prompts":[
          {"title":"Checklist inicial","text":"Crie um checklist para a rotina [nome da rotina] de um pequeno negócio [tipo]. Organize os passos em ordem, indique responsável, momento de execução, evidência de conclusão e o que fazer quando houver um problema."},
          {"title":"Adaptar por função","text":"Adapte este checklist para a função [função]: [cole o checklist]. Remova etapas que não pertencem à função, detalhe as responsabilidades e indique quando deve pedir ajuda ou escalar uma decisão."},
          {"title":"Personalizar com contexto","text":"Personalize o checklist usando este contexto do negócio: [contexto]. Preserve os controles importantes, use linguagem simples e destaque pontos que precisam de confirmação antes de concluir."}
        ],
        "questions":[{"code":"pergunta_1","prompt":"O que torna um checklist operacional útil?","position":1,"options":[{"code":"opcao_1","label":"Passos claros, ordem, responsável e evidência de conclusão adaptados à rotina real.","is_correct":true,"position":1},{"code":"opcao_2","label":"Instruções genéricas sem responsável ou contexto.","is_correct":false,"position":2},{"code":"opcao_3","label":"Uma lista longa que nunca é revisada.","is_correct":false,"position":3}]}],
        "checklist":[]
      },
      {
        "code":"gestao_aula_4",
        "title":"Aula 4 — Mão na massa: proposta comercial e contratos",
        "minutes":5,
        "description":"Rascunho — pendente de revisão. Melhore a clareza de uma proposta, prepare respostas para clientes e faça somente uma triagem inicial de contrato. A análise da IA não substitui revisão jurídica e não deve receber documentos reais com dados sensíveis sem os controles adequados.",
        "prompts":[
          {"title":"Otimizar proposta","text":"Revise esta proposta comercial: [texto sem dados pessoais]. Melhore clareza, estrutura e ligação entre problema, solução, escopo, prazo, valor e próximo passo. Liste informações ausentes em vez de inventá-las."},
          {"title":"Modelo de resposta","text":"Crie um modelo de resposta para a dúvida do cliente [dúvida]. Use tom [tom], responda objetivamente, deixe claros limites e condições e proponha um próximo passo sem pressão excessiva."},
          {"title":"Análise inicial de contrato","text":"Faça uma triagem inicial deste contrato fictício ou anonimizado: [texto]. Resuma obrigações, prazos, valores, multas, renovação e rescisão; liste pontos ambíguos e perguntas para um profissional. Não dê uma conclusão jurídica nem recomende assinatura."}
        ],
        "questions":[{"code":"pergunta_1","prompt":"Qual é o limite da IA ao analisar um contrato?","position":1,"options":[{"code":"opcao_1","label":"Ela pode apoiar resumo e triagem, mas pontos relevantes precisam de conferência e orientação profissional.","is_correct":true,"position":1},{"code":"opcao_2","label":"Ela substitui qualquer revisão jurídica e garante que o contrato é seguro.","is_correct":false,"position":2},{"code":"opcao_3","label":"Ela pode inventar cláusulas ausentes para completar o documento.","is_correct":false,"position":3}]}],
        "checklist":[]
      },
      {
        "code":"gestao_aula_5",
        "title":"Aula 5 — Fechamento e avaliação",
        "minutes":6,
        "description":"Rascunho — pendente de revisão. Reúna os artefatos produzidos, confira-os contra as fontes originais e registre quais limites exigem apoio profissional. A entrega demonstra organização e revisão crítica, não aconselhamento financeiro, contábil ou jurídico.",
        "prompts":[],
        "questions":[
          {"code":"pergunta_1","prompt":"Qual uso da IA é adequado para registros financeiros?","position":1,"options":[{"code":"opcao_1","label":"Organizar e analisar dados conferidos, indicando incertezas e preservando a fonte original.","is_correct":true,"position":1},{"code":"opcao_2","label":"Inventar valores quando um comprovante estiver ilegível.","is_correct":false,"position":2},{"code":"opcao_3","label":"Autorizar pagamentos sem revisão.","is_correct":false,"position":3}]},
          {"code":"pergunta_2","prompt":"O que fazer quando uma informação não aparece no documento?","position":2,"options":[{"code":"opcao_1","label":"Marcar como ausente e buscar confirmação na fonte ou com a pessoa responsável.","is_correct":true,"position":1},{"code":"opcao_2","label":"Pedir para a IA escolher o valor mais provável e tratá-lo como certo.","is_correct":false,"position":2},{"code":"opcao_3","label":"Apagar o registro inteiro sem avisar.","is_correct":false,"position":3}]},
          {"code":"pergunta_3","prompt":"Qual característica é essencial em um checklist operacional?","position":3,"options":[{"code":"opcao_1","label":"Ser acionável e adaptado a uma rotina, com responsáveis e critérios de conclusão.","is_correct":true,"position":1},{"code":"opcao_2","label":"Ser igual para qualquer negócio e função.","is_correct":false,"position":2},{"code":"opcao_3","label":"Evitar registrar problemas encontrados.","is_correct":false,"position":3}]},
          {"code":"pergunta_4","prompt":"Como usar IA com contratos de forma responsável?","position":4,"options":[{"code":"opcao_1","label":"Usar para triagem e perguntas, anonimizar dados quando necessário e procurar revisão profissional.","is_correct":true,"position":1},{"code":"opcao_2","label":"Enviar qualquer documento sensível e aceitar a conclusão sem conferência.","is_correct":false,"position":2},{"code":"opcao_3","label":"Alterar cláusulas sem conhecimento das partes.","is_correct":false,"position":3}]},
          {"code":"pergunta_5","prompt":"Qual resultado demonstra melhor a aplicação da trilha de gestão?","position":5,"options":[{"code":"opcao_1","label":"Uma estrutura de gestão, um checklist e uma análise assistida revisados e contextualizados.","is_correct":true,"position":1},{"code":"opcao_2","label":"Uma resposta genérica sem dados do processo.","is_correct":false,"position":2},{"code":"opcao_3","label":"Apenas abrir um projeto vazio.","is_correct":false,"position":3}]}
        ],
        "checklist":["Criei uma estrutura de projeto para a gestão do negócio.","Defini categorias de receitas e despesas.","Transformei uma anotação fictícia ou anonimizada em registro estruturado.","Defini um padrão para comprovantes e conferência.","Analisei gastos sem aceitar conclusões não verificadas.","Criei um checklist operacional em ordem clara.","Adaptei responsáveis e evidências de conclusão.","Revisei uma proposta comercial sem inventar informações.","Fiz uma triagem de contrato com ressalvas e perguntas para revisão profissional.","Registrei as fontes, incertezas e alterações feitas após a revisão."]
      }
    ]
  },
  {
    "code":"desenvolvimento_codex",
    "name":"Desenvolvimento Avançado com Codex",
    "position":3,
    "description":"Rascunho editorial — Trilha avançada para transformar uma necessidade em escopo, criar artefatos digitais com Codex, testar o resultado, corrigir problemas e publicar uma versão compartilhável.",
    "badge":{"code":"selo_desenvolvimento_codex","title":"Selo Desenvolvimento Avançado com Codex","description":"Reconhece a criação, teste e evolução de um artefato digital funcional com apoio do Codex."},
    "lessons":[
      {
        "code":"codex_aula_1",
        "title":"Aula 1 — O que é o Codex: agente de desenvolvimento e instalação",
        "minutes":7,
        "description":"Rascunho — pendente de revisão. Conheça a diferença entre conversar sobre uma solução e delegar tarefas de desenvolvimento a um agente que lê arquivos, propõe mudanças e executa verificações dentro de um projeto controlado.",
        "prompts":[{"title":"Instalação via terminal (alternativa)","text":"npm install -g @openai/codex\ncodex"}],
        "questions":[{"code":"pergunta_1","prompt":"O que diferencia o Codex de uma conversa comum com um assistente?","position":1,"options":[{"code":"opcao_1","label":"Ele pode trabalhar sobre arquivos e tarefas de desenvolvimento em um ambiente controlado, seguindo instruções e verificações.","is_correct":true,"position":1},{"code":"opcao_2","label":"Ele publica qualquer sistema sem revisar código ou permissões.","is_correct":false,"position":2},{"code":"opcao_3","label":"Ele serve apenas para escrever mensagens comerciais.","is_correct":false,"position":3}]}],
        "checklist":[]
      },
      {
        "code":"codex_aula_2",
        "title":"Aula 2 — Caso de uso: do pedido ao projeto",
        "minutes":5,
        "description":"Rascunho — pendente de revisão. Antes de pedir código, descreva o problema, quem usará a solução, o fluxo principal, o que deve ficar fora do primeiro escopo e como você saberá que a entrega funciona.",
        "prompts":[{"title":"Definir escopo mínimo","text":"Quero transformar esta necessidade em um projeto mínimo: [necessidade]. Faça perguntas essenciais e depois proponha objetivo, usuário, fluxo principal, dados necessários, critérios de aceite, riscos e itens explicitamente fora do primeiro escopo. Não comece a implementar enquanto houver ambiguidades críticas."}],
        "questions":[],
        "checklist":[]
      },
      {
        "code":"codex_aula_3",
        "title":"Aula 3 — Mão na massa: criar um site com Codex",
        "minutes":10,
        "description":"Rascunho — pendente de revisão. Crie uma primeira versão de site, abra o preview local e melhore a interface com base no conteúdo, nos erros observados e no uso em telas pequenas.",
        "prompts":[
          {"title":"Briefing do site","text":"Crie um site responsivo para [negócio] com objetivo [objetivo] e público [público]. Inclua [seções], chamada principal [ação], informações reais fornecidas a seguir [conteúdo] e critérios de acessibilidade. Antes de editar, identifique a estrutura existente e preserve o que já funciona."},
          {"title":"Preview local","text":"Execute as verificações disponíveis e inicie o preview local da aplicação. Informe o endereço, erros encontrados e quais páginas ou fluxos devo conferir. Não ignore falhas de build, TypeScript ou console."},
          {"title":"Ajustes após revisão","text":"Aplique estes ajustes ao site: [lista]. Preserve responsividade e acessibilidade, explique mudanças relevantes e execute novamente as verificações afetadas."}
        ],
        "questions":[{"code":"pergunta_1","prompt":"Por que abrir e testar o preview local antes de publicar?","position":1,"options":[{"code":"opcao_1","label":"Para verificar conteúdo, fluxo, responsividade e erros reais antes de compartilhar a solução.","is_correct":true,"position":1},{"code":"opcao_2","label":"Porque o código não precisa de build quando está no computador.","is_correct":false,"position":2},{"code":"opcao_3","label":"Para evitar revisar a experiência em telas diferentes.","is_correct":false,"position":3}]}],
        "checklist":[]
      },
      {
        "code":"codex_aula_4",
        "title":"Aula 4 — Mão na massa: criar uma proposta com Codex",
        "minutes":7,
        "description":"Rascunho — pendente de revisão. Use arquivos e templates do projeto para gerar uma proposta estruturada, depois revise conteúdo, cálculos, consistência visual e informações que não podem ser inventadas.",
        "prompts":[
          {"title":"Criar proposta","text":"Crie uma proposta comercial a partir deste briefing: [briefing]. Use o template existente [caminho, se houver], organize problema, solução, escopo, entregáveis, prazo, investimento, condições e próximo passo. Marque dados ausentes e não invente valores."},
          {"title":"Melhorar versão","text":"Revise a proposta criada considerando: [feedback]. Verifique consistência dos números, clareza, tom, hierarquia visual e aderência ao briefing. Gere uma nova versão sem apagar a anterior."}
        ],
        "questions":[],
        "checklist":[]
      },
      {
        "code":"codex_aula_5",
        "title":"Aula 5 — Mão na massa: criar sistema com formulário",
        "minutes":10,
        "description":"Rascunho — pendente de revisão. Construa um fluxo pequeno com formulário, armazenamento ou processamento definido, estados de sucesso e erro, validação dos campos e um teste completo do início ao fim.",
        "prompts":[
          {"title":"Definir campos","text":"Para o fluxo [objetivo], proponha os campos mínimos do formulário, tipo de dado, obrigatoriedade, validação, texto de ajuda e cuidados de privacidade. Evite coletar dados que não são necessários."},
          {"title":"Implementar fluxo","text":"Implemente o formulário e o fluxo de envio seguindo estes critérios: [critérios]. Reutilize componentes existentes, trate carregamento, sucesso e erro, valide no servidor e não exponha segredos no cliente."},
          {"title":"Testar fluxo","text":"Teste o fluxo completo com casos válido, inválido, incompleto e falha de serviço. Registre o resultado de cada teste, corrija defeitos e execute novamente as verificações relevantes."},
          {"title":"Refinar solução","text":"Refine o sistema com base nestes resultados de teste e feedback: [resultados]. Priorize clareza, segurança, acessibilidade e simplicidade; não adicione funcionalidades fora do escopo sem justificar."}
        ],
        "questions":[{"code":"pergunta_1","prompt":"O que comprova que um formulário funciona de ponta a ponta?","position":1,"options":[{"code":"opcao_1","label":"Testar entradas válidas e inválidas, envio, persistência ou processamento e mensagens de sucesso e erro.","is_correct":true,"position":1},{"code":"opcao_2","label":"Ver apenas se o botão aparece na tela.","is_correct":false,"position":2},{"code":"opcao_3","label":"Ignorar validação no servidor.","is_correct":false,"position":3}]}],
        "checklist":[]
      },
      {
        "code":"codex_aula_6",
        "title":"Aula 6 — Publicação, link compartilhável e fechamento",
        "minutes":6,
        "description":"Rascunho — pendente de revisão. Faça a última revisão, publique pelo ambiente configurado, confirme a resposta do link compartilhável e registre o que foi criado, testado e melhorado. Não exponha segredos, dados pessoais ou ambientes administrativos.",
        "prompts":[],
        "questions":[
          {"code":"pergunta_1","prompt":"Qual é o primeiro passo antes de implementar com Codex?","position":1,"options":[{"code":"opcao_1","label":"Definir o problema, o usuário, o escopo mínimo e critérios de aceite.","is_correct":true,"position":1},{"code":"opcao_2","label":"Adicionar o maior número possível de funcionalidades.","is_correct":false,"position":2},{"code":"opcao_3","label":"Publicar antes de entender o pedido.","is_correct":false,"position":3}]},
          {"code":"pergunta_2","prompt":"O que fazer quando uma verificação de build ou tipo falha?","position":2,"options":[{"code":"opcao_1","label":"Investigar, corrigir a causa e executar a verificação novamente.","is_correct":true,"position":1},{"code":"opcao_2","label":"Ignorar a falha e afirmar que a entrega está pronta.","is_correct":false,"position":2},{"code":"opcao_3","label":"Apagar os testes para esconder o erro.","is_correct":false,"position":3}]},
          {"code":"pergunta_3","prompt":"Por que preservar versões anteriores de um artefato?","position":3,"options":[{"code":"opcao_1","label":"Para comparar mudanças, recuperar uma versão estável e registrar a evolução.","is_correct":true,"position":1},{"code":"opcao_2","label":"Para evitar qualquer revisão futura.","is_correct":false,"position":2},{"code":"opcao_3","label":"Para duplicar arquivos sem finalidade.","is_correct":false,"position":3}]},
          {"code":"pergunta_4","prompt":"O que deve ser verificado em um link publicado?","position":4,"options":[{"code":"opcao_1","label":"Acesso, conteúdo, fluxo principal, responsividade, erros e ausência de dados ou segredos indevidos.","is_correct":true,"position":1},{"code":"opcao_2","label":"Somente se o endereço é curto.","is_correct":false,"position":2},{"code":"opcao_3","label":"Apenas se funciona na conta do desenvolvedor.","is_correct":false,"position":3}]},
          {"code":"pergunta_5","prompt":"Qual evidência demonstra melhor a competência desenvolvida nesta trilha?","position":5,"options":[{"code":"opcao_1","label":"Um artefato funcional, testado, revisado e acompanhado de uma explicação breve do problema e da solução.","is_correct":true,"position":1},{"code":"opcao_2","label":"Uma ideia sem implementação ou teste.","is_correct":false,"position":2},{"code":"opcao_3","label":"Uma cópia sem compreender o fluxo criado.","is_correct":false,"position":3}]}
        ],
        "checklist":["Defini o problema, o usuário e o escopo mínimo.","Registrei critérios de aceite verificáveis.","Criei pelo menos um artefato digital funcional.","Usei conteúdo e dados autorizados, sem expor segredos.","Executei o build ou as verificações disponíveis.","Testei o fluxo principal e casos de erro.","Revisei a solução em tela pequena e grande quando aplicável.","Corrigi problemas encontrados e gerei uma versão melhorada.","Publiquei ou gerei um link compartilhável seguro.","Documentei brevemente o problema, a solução, os testes e os limites restantes."]
      }
    ]
  }
]
$json$::jsonb;
begin
  if exists (
    select 1 from catalog.journey_definitions
    where owner_organization_id = v_org and code = 'capacitacao_ia_mei_openai'
  ) then
    raise exception 'OPENAI_JOURNEY_ALREADY_EXISTS';
  end if;

  select id into v_program_id
  from catalog.programs
  where owner_organization_id = v_org and code = 'capacitacao_ia_openai';

  if v_program_id is null then
    v_program_id := app_private.e14_deterministic_uuid('program|capacitacao_ia_openai|' || v_org::text);
    insert into catalog.programs(
      id, owner_organization_id, code, name, description, status,
      valid_from, valid_until, created_at, updated_at
    ) values (
      v_program_id, v_org, 'capacitacao_ia_openai',
      'Capacitação em IA — Estímulo <> OpenAI',
      'Programa da jornada prática de marketing, gestão e desenvolvimento avançado com IA.',
      'active', current_date, null, now(), now()
    );
  end if;

  select public.save_admin_product_resource(
    v_actor, v_org, 'journey',
    jsonb_build_object(
      'program_id', v_program_id,
      'code', 'capacitacao_ia_mei_openai',
      'slug', 'capacitacao-ia-mei-openai',
      'name', 'Capacitação em IA para MEI/ME – Estímulo <> OpenAI',
      'purpose', 'Desenvolver competências práticas de marketing, vendas, gestão e criação de soluções digitais com IA.',
      'title', 'Capacitação em IA para MEI/ME – Estímulo <> OpenAI',
      'description', 'Jornada prática em três trilhas: Marketing e Vendas com IA, Gestão com IA e Desenvolvimento Avançado com Codex.',
      'configuration', jsonb_build_object(
        'editorial_status', 'draft_reconstructed_pending_review',
        'source_basis', jsonb_build_array(
          '2026-07-24 implementation plan',
          'OPENAI_JOURNEY_SPEC v0.1',
          'OPENAI_COMPETENCY_MODEL v0.1',
          'OPENAI_ASSESSMENT_AND_PRACTICE v0.1'
        ),
        'source_documents_available', false,
        'content_notice', 'Instructional copy, prompts and distractors are reconstructed drafts pending comparison with the original facilitator scripts.'
      ),
      'eligible_archetype_codes', '[]'::jsonb
    ),
    app_private.e14_deterministic_uuid('seed|openai|journey')::text
  ) into v_result;

  v_journey_definition_id := (v_result ->> 'definition_id')::uuid;
  v_journey_version_id := (v_result ->> 'version_id')::uuid;

  for v_path in select value from jsonb_array_elements(v_paths)
  loop
    select public.save_admin_product_resource(
      v_actor, v_org, 'path_template',
      jsonb_build_object(
        'journey_version_id', v_journey_version_id,
        'code', v_path ->> 'code',
        'name', v_path ->> 'name',
        'description', v_path ->> 'description',
        'position', (v_path ->> 'position')::integer,
        'is_default', (v_path ->> 'position')::integer = 1
      ),
      app_private.e14_deterministic_uuid('seed|openai|path|' || (v_path ->> 'code'))::text
    ) into v_result;
    v_path_id := (v_result ->> 'path_template_id')::uuid;

    for v_lesson in select value from jsonb_array_elements(v_path -> 'lessons')
    loop
      v_configuration := jsonb_build_object(
        'editorial_status', 'draft_reconstructed_pending_review',
        'source_documents_available', false,
        'prompts', coalesce(v_lesson -> 'prompts', '[]'::jsonb),
        'practice_checklist', coalesce(v_lesson -> 'checklist', '[]'::jsonb)
      );
      v_activity_payload := jsonb_build_object(
        'code', v_lesson ->> 'code',
        'name', v_lesson ->> 'title',
        'title', v_lesson ->> 'title',
        'description', v_lesson ->> 'description',
        'activity_type', case when jsonb_array_length(coalesce(v_lesson -> 'checklist', '[]'::jsonb)) > 0 then 'practice' else 'content' end,
        'estimated_minutes', (v_lesson ->> 'minutes')::integer,
        'configuration', v_configuration
      );

      if jsonb_array_length(coalesce(v_lesson -> 'questions', '[]'::jsonb)) > 0 then
        v_activity_payload := v_activity_payload || jsonb_build_object(
          'assessment', jsonb_build_object('questions', v_lesson -> 'questions')
        );
      end if;
      if jsonb_array_length(coalesce(v_lesson -> 'checklist', '[]'::jsonb)) > 0 then
        v_activity_payload := v_activity_payload || jsonb_build_object(
          'practice', jsonb_build_object(
            'submission_mode', 'file',
            'allowed_evidence_types', jsonb_build_array('file','text','link'),
            'review_required', true
          )
        );
      end if;

      select public.save_admin_product_resource(
        v_actor, v_org, 'activity', v_activity_payload,
        app_private.e14_deterministic_uuid('seed|openai|activity|' || (v_lesson ->> 'code'))::text
      ) into v_result;
      v_activity_version_id := (v_result ->> 'version_id')::uuid;

      select public.save_admin_product_resource(
        v_actor, v_org, 'path_step',
        jsonb_build_object(
          'code', 'passo_' || (v_path ->> 'code') || '_' || (v_lesson ->> 'code'),
          'path_template_id', v_path_id,
          'step_code', v_lesson ->> 'code',
          'activity_version_id', v_activity_version_id,
          'position', (select ordinality from jsonb_array_elements(v_path -> 'lessons') with ordinality x(value, ordinality) where x.value = v_lesson limit 1),
          'is_required', true,
          'metadata', jsonb_build_object('editorial_status','draft_reconstructed_pending_review')
        ),
        app_private.e14_deterministic_uuid('seed|openai|step|' || (v_lesson ->> 'code'))::text
      ) into v_result;
    end loop;

    select public.save_admin_product_resource(
      v_actor, v_org, 'rule',
      jsonb_build_object(
        'code', 'cred_' || (v_path ->> 'code'),
        'name', 'Conclusão — ' || (v_path ->> 'name'),
        'rule_type', 'credential',
        'language', 'credential-v1',
        'expression', jsonb_build_object(
          'scope', 'path',
          'path_template_id', v_path_id,
          'requires_completed_status', true
        ),
        'input_schema', '{}'::jsonb,
        'output_schema', '{}'::jsonb
      ),
      app_private.e14_deterministic_uuid('seed|openai|rule|' || (v_path ->> 'code'))::text
    ) into v_result;
    v_rule_version_id := (v_result ->> 'version_id')::uuid;

    select public.save_admin_product_resource(
      v_actor, v_org, 'badge',
      jsonb_build_object(
        'code', v_path #>> '{badge,code}',
        'name', v_path #>> '{badge,title}',
        'title', v_path #>> '{badge,title}',
        'description', v_path #>> '{badge,description}',
        'criteria_rule_version_id', v_rule_version_id,
        'status', 'draft'
      ),
      app_private.e14_deterministic_uuid('seed|openai|badge|' || (v_path ->> 'code'))::text
    ) into v_result;
  end loop;

  select content_hash into v_content_hash
  from catalog.journey_versions where id = v_journey_version_id;

  perform public.publish_admin_journey_version(
    v_actor, v_org, v_journey_version_id, v_content_hash,
    app_private.e14_deterministic_uuid('seed|openai|publish')::text
  );
end;
$seed$;
