# Nomenclatura e versionamento de eventos

**Versão:** 0.1

## 1. Nome canônico

Formato:

```text
org.estimulo.<contexto>.<recurso>.<fato-no-passado>
```

Exemplos:

- `org.estimulo.learning.activity.completed`
- `org.estimulo.diagnostic.session.completed`
- `org.estimulo.practice.submission.accepted`
- `org.estimulo.integration.sync.failed`

Regras:

- minúsculas;
- significado de negócio, não nome de tela ou botão;
- passado para fatos;
- sem nome de jornada, parceiro ou fornecedor no núcleo;
- sem versões no nome enquanto a semântica permanecer a mesma;
- sem eventos genéricos como `user.action`, `item.updated` ou `engaged`.

## 2. Evolução de schema

A versão exata fica em `dataschema`, com SemVer.

| Mudança | Regra |
|---|---|
| Correção documental sem alterar validação | patch |
| Campo opcional novo e sem mudança semântica | minor |
| Campo obrigatório novo | major |
| Remoção/renomeação de campo | major |
| Mudança de significado ou unidade | major ou novo tipo |
| Novo valor de enum que consumidores antigos não toleram | major |
| Novo evento | novo tipo, versão inicial 1.0.0 |

Schemas publicados são imutáveis. Uma correção gera nova versão.

## 3. Compatibilidade de consumidores

- consumidores declaram os tipos e majors suportados;
- campos opcionais desconhecidos devem ser ignorados pelo código do consumidor;
- um consumidor não pode processar silenciosamente um major desconhecido;
- durante migração, produtor e consumidores devem suportar o major atual e o imediatamente anterior quando houver eventos ainda em trânsito;
- CI executará exemplos e testes de compatibilidade antes de publicar contratos.

## 4. Depreciação

1. publicar substituto;
2. registrar mapeamento;
3. migrar consumidores;
4. interromper produção do tipo antigo;
5. manter leitura enquanto houver retenção/replay;
6. nunca renomear eventos históricos.

## 5. Correção e anulação

Eventos não são editados. Quando um fato de domínio muda, emite-se o evento normal da nova transição. Quando o evento original representou o fato incorretamente, o evento corretivo referencia `correctionof` e descreve o motivo com código controlado.

Dados que precisem ser eliminados por política de privacidade seguem o processo de redaction/pseudonymization; isso não deve ser disfarçado como correção semântica.
