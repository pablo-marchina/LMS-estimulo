# Fluxo lógico de integração com HubSpot

**Versão:** 0.1  
**Status:** Arquitetura lógica; mapeamento físico bloqueado pelo inventário do sandbox.

## 1. Papel do HubSpot

HubSpot é o CRM de relacionamento. A plataforma é proprietária do estado educacional detalhado, dos eventos, das respostas e das features. O CRM receberá apenas campos e fatos necessários a relacionamento, segmentação e operação aprovados.

## 2. Saída da plataforma

```text
Evento interno relevante
→ CRM projection rule
→ snapshot do valor a sincronizar
→ integration.sync.requested
→ job com chave (target, object, field set, source version)
→ HubSpot API
→ succeeded / failed / conflict
→ integration history
```

A criação do job é desacoplada da resposta ao usuário. Falha no HubSpot não desfaz diagnóstico, progresso ou conclusão.

## 3. Entrada do HubSpot

```text
Webhook HubSpot
→ raw receipt isolado
→ assinatura e replay validation
→ external object mapping
→ regra de ownership
→ comando interno autorizado ou atualização de mapping
→ eventos canônicos internos
```

Webhooks não escrevem diretamente em entidades de domínio.

## 4. Ownership

Cada propriedade futura deverá ser classificada como:

- `platform_owned`;
- `hubspot_owned`;
- `shared_with_rule`;
- `read_only_reference`.

Conflitos em `shared_with_rule` exigem política explícita; timestamps isolados não bastam quando o significado difere.

## 5. Informações candidatas, ainda não aprovadas

- identificadores e associações;
- diagnóstico concluído e sua versão;
- jornada/trilha atribuída;
- progresso agregado;
- última atividade relevante;
- conclusão e certificado;
- segmento operacional temporário;
- próxima intervenção operacional;
- status de sincronização.

Não enviar por padrão: respostas detalhadas, eventos brutos, arquivos, texto livre, features experimentais e score.

## 6. Pendências bloqueadoras do E11

- plano HubSpot;
- objetos e pipelines existentes;
- propriedades e tipos;
- IDs de contato/empresa/operação;
- sandbox e limites de API;
- webhooks disponíveis;
- regras de duplicidade e associação;
- workflows existentes;
- ownership institucional dos campos.
