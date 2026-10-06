# Guia para agentes — Travel OS

## Continuidade

Antes de trabalho relevante, leia [estado](docs/PROJECT_STATE.md),
[decisões](docs/DECISIONS.md) e [roadmap](docs/ROADMAP.md), depois os arquivos
afetados. Código e testes são a fonte da verdade sobre implementação; documentos
podem estar desatualizados. Instruções atuais do usuário prevalecem. O roadmap
orienta prioridades, mas não autoriza executar tarefas fora do pedido.

Após mudanças relevantes, atualize o estado e seus resultados de validação,
registre decisões permanentes confirmadas e ajuste o roadmap. Separe fatos,
hipóteses e propostas; não transforme suposições em preferências de produto.
Use README para configuração/uso e docs/QA.md como evidência histórica datada.
Atualize README quando comportamento, configuração ou limitações mudarem.

## Modelo e raciocínio

Antes de iniciar cada tarefa, informe brevemente complexidade, menor modelo e
esforço suficientes, com uma justificativa. Use as opções disponíveis no Codex:

| Tarefa | Recomendação inicial |
|---|---|
| Mecânica/repetitiva, escopo claro | Luna, baixo; médio se exigir cruzar arquivos |
| Implementação e raciocínio intermediário | Sol, médio |
| Implementação complexa, persistência ou concorrência | Sol, alto; extra alto se justificado |
| Arquitetura de alto impacto, problema excepcional ou revisão importante | Avaliar Astra, médio/alto conforme incerteza |

Prefira a opção econômica que cumpra os critérios de qualidade. Ajuste o esforço
antes de escalar o modelo, conforme risco e evidência. Não recomende Astra por
uma tentativa falha: primeiro confira contexto, arquivos, requisitos, permissões,
ambiente e reprodução. Essas regras recomendam a seleção ao usuário; não alegue
trocar automaticamente o modelo da conversa. Não use modelos/agentes externos
para contornar uma restrição do usuário.

Agrupe apenas questões difíceis de alto impacto em [ASTRA_QUEUE](docs/ASTRA_QUEUE.md).
Antes de revisão pelo Astra, prepare objetivo, contexto mínimo, diff/arquivos
críticos, testes, tentativas, incertezas e perguntas específicas. Não envie o
repositório inteiro quando um recorte bastar; elimine segredos e dados pessoais.
A fila não dispara chamadas nem troca de modelo; siga a autorização do usuário.

## Implementação e dados

React/TypeScript estrito, componentes funcionais e padrões existentes. Mantenha
regras no domínio, persistência em data/adapters e reutilize controles e tokens.
Leia PROJECT_STATE para arquitetura e README antes de mudar integrações.

Preserve dados, IDs, isolamento por proprietário/viagem e migrações idempotentes.
Não limpe localStorage/IndexedDB, apague registros ou execute operações destrutivas
sem autorização explícita. Preserve arquivamento, compra/gasto atômicos e revisão
de conflitos. Não invente seeds, horários, fusos ou cotações; identifique fallback
manual/cache e indisponibilidade. Não exponha segredos no frontend ou com VITE_.

## Verificação e Git

Node >=22.12.0; pnpm 11.19.0 e lockfile preservado. Comandos: `pnpm dev`,
`pnpm test`, `pnpm build`, `pnpm preview --port 5173`. Instalação, se necessária:
`pnpm install --frozen-lockfile`. Formate só arquivos editados; `pnpm format`
reescreve todo src e vite.config.ts. Não existe script de lint.

Sempre execute verificações/testes relevantes após alterações: em documentação,
valide links, coerência e diff; em código, testes do comportamento e build.
Verifique api/places.ts separadamente, pois está fora do tsconfig principal.
Para persistência, cubra migração real, isolamento, reabertura e concorrência;
para UI, fluxos afetados e 375/402/440 px. Use dados sintéticos, preserve a origem
do navegador e não certifique dispositivo físico com viewport desktop.

Confira Git antes e depois do trabalho; preserve alterações alheias, mantenha
diffs pequenos e relate arquivos, testes, limitações e pendências. Não faça reset,
clean ou reescrita de histórico sem autorização. Crie commits quando autorizados;
não declare uma tarefa concluída antes da validação e da atualização documental.
