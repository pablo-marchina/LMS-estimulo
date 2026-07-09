# Governança de fornecedores e transferências internacionais

## Partes registradas

Estímulo, Supabase, AWS e HubSpot foram registrados como hipóteses de papel. Nenhum contrato, DPA, região ou mecanismo de transferência foi aprovado no banco.

## Avaliação por fornecedor

- entidade jurídica contratada e papel no tratamento;
- produtos/serviços utilizados;
- dados e finalidades;
- regiões de armazenamento, processamento, backup e suporte;
- subprocessadores;
- retenção e eliminação;
- criptografia e gestão de chaves;
- IAM, logs, incidentes e comunicação;
- portabilidade e saída;
- contrato/DPA e transferências internacionais;
- evidências de segurança e exceções.

## Regras

- não ativar sincronização CRM sem allowlist de campos;
- não usar ambiente de teste com dados reais sem avaliação e autorização;
- não assumir que a região principal elimina transferências por suporte, telemetry ou subprocessadores;
- não aceitar termos de fornecedor como substituto do ROPA e do aviso ao titular;
- registrar mudança de subprocessador/região como mudança relevante de tratamento.

## Bloqueios

`VENDOR_DPA_APPROVED`, `INTERNATIONAL_TRANSFER_ASSESSED` e `HUBSPOT_DATA_INVENTORY_APPROVED` continuam bloqueados.
