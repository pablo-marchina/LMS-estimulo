# Motor configurável de diagnóstico

## Escopo

O diagnóstico principal suporta instrumentos versionados, perguntas, opções, dimensões, perfis, pesos e thresholds configuráveis, além de sessões, respostas e resultados auditáveis. Diagnósticos opcionais possuem execução própria e não alteram automaticamente o arquétipo principal ou a elegibilidade de jornada.

## Semântica de cálculo

Para uma configuração publicada válida:

1. o score de cada dimensão é a média dos `score` das respostas aplicáveis à dimensão;
2. thresholds de perfil são interpretados como limites superiores inclusivos;
3. as faixas são avaliadas em ordem crescente do limite superior, evitando que uma faixa ampla capture um score pertencente a uma faixa inferior;
4. configuração incompleta ou inconsistente segue as regras de validação/abstenção do instrumento, em vez de receber defaults metodológicos silenciosos.

A semântica acima executa a configuração; ela não define por si só quais perguntas, contribuições, pesos ou cortes são metodologicamente corretos.

## Publicação e histórico

O diagnóstico usa definição–versão–instância:

```text
definição
→ versão em rascunho
→ validação estrutural
→ versão publicada
→ sessões, respostas e resultados ligados à versão utilizada
```

Publicação preserva a capacidade de reproduzir resultados anteriores. Mudanças incompatíveis de perfis exigem a política de mapeamento definida pelo domínio.

## Idempotência e auditoria

Início, resposta, conclusão e atribuição usam identificadores estáveis/idempotentes. A execução registra informação suficiente para explicar qual instrumento e configuração produziram o resultado.

## Limites

- metodologia oficial precisa de fonte e aprovação próprias;
- diagnóstico e arquétipo não decidem crédito por padrão;
- diagnóstico opcional não substitui o principal;
- resultado inconclusivo não deve ser convertido silenciosamente em um perfil arbitrário.

## Validação

A semântica e os invariantes são protegidos por testes de produto, aplicação e banco executados pelos gates canônicos do repositório.