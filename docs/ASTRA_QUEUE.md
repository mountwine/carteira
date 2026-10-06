# Fila de revisão Astra

Atualizado em 06/10/2026. **Nenhuma tarefa pendente.** Nenhum problema da auditoria
foi enviado ao Astra; esta etapa não utiliza Astra.

## Critérios de entrada

Adicionar somente questão de alto impacto que demande decisão arquitetural,
resolução excepcionalmente difícil ou revisão importante, com incerteza concreta
remanescente. Antes, verificar contexto, arquivos, requisitos, permissões, ambiente
e reprodução; uma tentativa falha não basta. Correções rotineiras ficam no ROADMAP.

Agrupar perguntas relacionadas numa revisão coerente, evitar duplicação e manter
o pacote atualizado após mudanças relevantes. Entrada na fila não autoriza chamada,
compartilhamento, troca de modelo, decisão de produto ou implementação.

## Questões pendentes

Nenhuma.

## Estrutura de uma entrada futura

Modelo de registro; não representa uma tarefa existente:

```text
ID / data:
Estado: proposta | pronta para revisão | revisada | encerrada
Objetivo e impacto:
Por que Sol/contexto atual não são suficientes:
Contexto mínimo (baseline/commit e decisões relacionadas):
Arquivos críticos / diff selecionado:
Testes executados, resultados e reprodução:
Tentativas e diagnósticos de contexto/ambiente:
Incertezas e alternativas com consequências:
Perguntas específicas a responder:
Autorização/seleção do usuário para revisão:
Resultado, evidência e próximos passos:
```

Enviar somente o necessário; excluir segredos/dados pessoais e evitar repositório
inteiro. Após revisão, registrar decisões efetivamente confirmadas em DECISIONS,
ações no ROADMAP e impactos implementados no PROJECT_STATE. Não reapresentar uma
questão resolvida sem evidência nova. Histórico de revisões: nenhum.
