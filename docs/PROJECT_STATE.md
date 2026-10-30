# Estado técnico — Foravento V1.2 em implantação (base funcional V1.1)

Atualizado em 20/10/2026. Referência funcional: checkpoint `b4c8568`
(Geoapify e estabilização), branch `main`; baseline original `7f1cc01` e K01
`6691395`. O shell visual e Minhas Viagens foram preservados no checkpoint
`8c71dda` antes da rodada visual integral. A evolução descrita abaixo está no
working tree, ainda sem novo commit. K02/K04/K05/K07 permanecem na base; nenhuma
migração ou limpeza de dados foi feita.

## Interface V1.2 — rodada visual integral em execução

- A entrada, o cabeçalho, o título do navegador e o nome do manifesto exibem
  **Foravento**. O símbolo enviado pelo usuário em 20/10/2026 foi copiado sem
  redesenho para `public/foravento-mark.png` e aparece na entrada e no cabeçalho.
- A Rodada 03 confirma Direção B — Em Movimento; a Rodada 04 define os tokens
  finais: canvas `#061923`, superfície `#102734`, ação `#315CCB`, seleção
  `#6799F0`, Archivo para títulos e Manrope para operação. As fontes ficam
  locais. O símbolo usado coincide com o asset incorporado à Rodada 04.
  Cabeçalho separa marca/conta da viagem selecionada/busca. Navegação mantém
  Início / Roteiro / + / Álbum / Mais; o + continua abrindo as quatro ações.
- O PRD e os mockups enviados são referências da V1 anterior: as abas Agente e
  Explorar neles não foram ativadas. A ordem V1.2 veio da instrução atual do usuário.
- Minhas Viagens agora usa cards horizontais agrupados por fase, capa real ou
  fundo escuro, contagem de viajantes e estado da fase; abrir e editar têm
  alvos separados de 48 px. O formulário conserva
  persistência, campos e validações; recebeu estilo dos controles da V1.2.
- Os HTMLs das Rodadas 01–04 foram recebidos e consultados; as pranchas são
  referência ilustrativa, e os valores explícitos da Rodada 04 prevalecem.
  A versão vetorial master do símbolo ainda não foi disponibilizada.
- Entrada usa capa fotográfica de referência licenciada; Início usa a capa real
  da viagem, ou superfície escura sem foto, e destaca dados reais de Antes,
  Durante e Depois. Roteiro tem faixa de datas e timeline compacta; a pesquisa
  de lugar continua ligada ao mesmo componente Geoapify. Mais apresenta os oito
  módulos definitivos em cards com ícones e contexto. Álbum oferece Por data e
  Imersivo horizontal, além do visualizador com ações.
- Formulários e modais compartilhados receberam controles, superfície e
  tipografia V1.2. O seletor de horário usa selects compactos acessíveis; a
  persistência e validações não mudaram. Reservas, gastos, compras, bagagem,
  documentos, conversor e viajantes receberam tratamento visual adicional.
- Ícones instaláveis e splash ainda conservam elementos V1.1; o arquivo master
  vetorial oficial do símbolo segue indisponível. Nome/manifesto foram atualizados.
- A prévia local `127.0.0.1:5174` recebeu `ALLOWED_ORIGIN` apenas no processo do
  servidor; a chave Geoapify preexistente permaneceu no ambiente server-side.
  Resposta real de `/api/places` incluiu nome, endereço, identificador e
  coordenadas. Origem, destino, atividade e reserva exibiram sugestões reais;
  locais selecionados foram salvos e reabertos em dados sintéticos isolados.
  `localhost:5173` tem origem e armazenamento distintos, preservados.
- Cards com foto e fallback escuro foram conferidos em 375/402/440 px, sem
  rolagem horizontal; abrir o card e o lápis dispararam ações independentes.
  Na rodada integral, capturas reais do navegador foram feitas para Início,
  Roteiro com atividade, Álbum, Mais, Conversor, Reservas e formulários. Uma
  atividade sintética foi criada após selecionar resultado real Geoapify e
  salva no armazenamento isolado de `127.0.0.1:5174`. Ainda falta verificação
  visual com dados representativos de todos os módulos. As três fases foram
  abertas com viagens sintéticas; não houve certificação em dispositivo físico.
  Nesta rodada, `pnpm test` passou com 83/83 testes, `pnpm build` passou com
  checagem TypeScript do aplicativo e de `api/places.ts` e geração PWA, e
  `git diff --check` não apontou problemas.

## Interface V1.3 — "Céu com passagem" (branch `claude/refactor-gpt-codex-app-od8qee`)

- Tema claro (céu azul-pálido, cartões brancos, navegação azul-marinho) em `src/styles/v13.css`, camada final que sobrescreve as anteriores. Fraunces (títulos, `public/fraunces*.woff2`, licença OFL) entra como serifa; Archivo e Manrope continuam. O tema escuro da V1.2 deixou de existir: não há alternância.
- Início usa o cartão de embarque (`src/features/TripPass.tsx`). O título mostra a cidade do dia e o dia da semana (`src/domain/homeHeadline.ts`); a cidade vem de `homeContext`, que já escolhia o destino pelas datas. Com mais de uma cidade, o cartão lista cada uma com seus dias e marca a atual.
- Editor de viagem pede chegada e saída de cada cidade quando há mais de uma. Ao acrescentar uma cidade, a última é dividida para cobrir a viagem. Validação em `destinationScheduleError` (dentro do período, saída depois da chegada, sem sobreposição; o dia da troca pode ser o mesmo). A validação fica só no editor: viagens antigas com destinos sobrepostos continuam abrindo e só pedem ajuste ao editar.
- Telas largas (>= 900 px): navegação vira trilho lateral.
- Validação: `pnpm typecheck`, `pnpm test` (90 testes) e `pnpm build` passaram. Conferido no navegador em 402 px e 1280 px: entrada, Início (duas cidades), Roteiro vazio, Mais, Reservas, Gastos, Compras, Bagagem, Documentos, Viajantes, Conversor, SOS e formulários. Não conferidos: Roteiro com atividades, Álbum e visualizador, mapa, impressão e dispositivo físico.

## Publicação

O projeto Vercel `foravento-v1.2-vercel-source` (com a chave Geoapify no ambiente) está ligado a `mountwine/carteira`, Node 24.x. Cada branch gera um preview; a busca de lugares só responde no endereço igual a `ALLOWED_ORIGIN`, então não funciona nos previews. Produção só muda com merge na `main`.

## Fonte e limites

Baseado na auditoria de 06/10/2026, código, testes, README e [QA histórica](QA.md)
de 05/10/2026. Código e testes prevalecem sobre este resumo. “Aparentemente
funcional” indica leitura e testes aplicáveis, não certificação de todos os fluxos.
A auditoria não abriu o aplicativo com dados pessoais nem alterou banco real.

## Arquitetura

SPA mobile em português brasileiro: React 19, TypeScript estrito, Vite e PWA.
Tema escuro, Archivo/Manrope locais e tokens centralizados. Node >=22.12.0, pnpm 11.19.0.
Dependências: Lucide, Supabase SDK, Leaflet, Workbox e vite-plugin-pwa; testes com
Vitest, fake-indexeddb e PGlite. Ter dependência instalada não significa uso ativo.

| Local          | Responsabilidade                                                                              |
| -------------- | --------------------------------------------------------------------------------------------- |
| src/app        | Sessão, histórico, seleção de viagem e composição de telas                                    |
| src/features   | Viagens, início, roteiro, álbum e ferramentas                                                 |
| src/components | Formulários compartilhados, controles e mídia                                                 |
| src/domain     | Modelos, validações, fases, conversões e mutações                                             |
| src/data       | IndexedDB, repository, engine, journal, arquivos e mídia                                      |
| src/adapters   | Autenticação/viagens locais, preferências e serviços externos                                 |
| api/places.ts  | Handler server-side compartilhado por Vercel e pelo middleware local Vite; não guarda viagens |
| supabase       | Schema, RLS, RPCs e migrações históricas da V1                                                |
| public         | Fotos de referência, fonte, licenças e ícones PWA                                             |
| tests          | Domínio, banco, offline, mídia e endpoint; há testes junto a src                              |
| docs           | Estado, continuidade e evidências de QA                                                       |

App.tsx e Workspace.tsx definem o fluxo ativo. Telas visitadas permanecem montadas;
trocar de viagem remonta o contexto. Engine usa alterações otimistas, journal local,
controle de versão, receipts e revisão de conflitos; repository usa IndexedDB e
BroadcastChannel. Não há sincronização remota ativa.

## Funcionalidades

| Área                        | Estado                                 | Escopo e limitações                                                                                                                                                               |
| --------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conta local                 | Implementada/aparentemente funcional   | Cadastro, login, edição e recuperação por chave local; sem email                                                                                                                  |
| Minhas viagens              | Parcial                                | Criação, edição, ordenação por fase e arquivamento; identidades/metadados preservados na edição (K01); K03 aberto                                                                 |
| Início                      | Parcial                                | Antes/durante/depois, preparação, próxima atividade, clima e retrospectiva; K05                                                                                                   |
| Roteiro                     | Implementado/aparentemente funcional   | Timeline, horários, conflitos, duplicação, mover dia e edição; K03/K02                                                                                                            |
| Reservas                    | Parcial                                | Tipo, período, horários, código, status, anexo e local estruturado editáveis; atividade vinculada recebe coordenadas; K02 ainda não representa cada dia de uma estadia no roteiro |
| Documentos                  | Implementados/aparentemente funcionais | Anexos locais, visualização, download e tipos personalizados; K06                                                                                                                 |
| Gastos                      | Implementados/aparentemente funcionais | Orçamento, categorias, divisão e taxas registradas; base de cálculo USD                                                                                                           |
| Compras                     | Implementadas/aparentemente funcionais | Wishlist, fotos, compra e gasto vinculados em transação; K06                                                                                                                      |
| Bagagem/checklist           | Implementados/aparentemente funcionais | Malas, pesos, itens de ida/retorno, compras físicas e preparação                                                                                                                  |
| Álbum                       | Implementado/aparentemente funcional   | Importação múltipla, EXIF JPEG, edição, visualizador e compartilhar/download                                                                                                      |
| Conversor                   | Implementado/aparentemente funcional   | Câmbio/cache, unidades e referências de tamanhos por marca                                                                                                                        |
| SOS                         | Implementado/aparentemente funcional   | Seguro, contatos, cartão pessoal, hospedagem e documentos essenciais; K02                                                                                                         |
| Busca e navegação           | Implementadas/aparentemente funcionais | Busca local, retorno contextual, Apple Maps/Google Maps/Waze externos                                                                                                             |
| Amigos/viajantes            | Parcial                                | Registros locais; amigos podem ser adicionados/listados; sem colaboração                                                                                                          |
| PWA                         | Implementada, validação parcial        | Manifest, precache e atualização; instalação/uso físico pendentes                                                                                                                 |
| Convites entre dispositivos | Não implementados                      | Interface informa indisponibilidade; código legado não é convite real ativo                                                                                                       |
| Backup/importação .travelos | Documentados, não implementados        | Sem restauração independente da origem do navegador                                                                                                                               |
| Sincronização/conta online  | Não implementadas no fluxo ativo       | Supabase desativado; sem backend de contas                                                                                                                                        |
| IA/tradução livre           | Não implementadas no fluxo ativo       | Sem integração OpenAI/agent ativa; Tradutor removido do escopo V1.2 por D021                                                                                                      |

Código aparentemente não utilizado pelo fluxo atual: Today, HomeConnected,
Travelers/Profile antigos, TripActions, Notifications, TravelMap, adapters/demo,
adapters/supabase e domain/agent. fullSeed é utilizado por testes históricos.
ChecklistScreen e Memories existem, mas não estão mapeados no Workspace atual;
o Início ainda lê Memórias legadas. providers contém catálogo/phrasebook e mocks
legados; câmbio ativo usa currentRate. Não confundir imports com telas acessíveis.

## Armazenamento e proteção de dados

- localStorage: viagens/participantes, sessão e preferências; mantém chaves legadas.
- IndexedDB `travel-os-v1`, versão 2: records, cache, pending, files, receipts,
  history, accounts, media e settings. Fotos têm blob comprimido e thumbnail.
- sessionStorage: chave de recuperação temporária para apresentação ao usuário.
- Service worker: arquivos da aplicação; não é backup dos dados pessoais.
- Senha e chave de recuperação derivadas com PBKDF2/SHA-256, sal aleatório e
  210.000 iterações; registros e blobs não são criptografados em repouso.
- Exclusões de viagens/fotos usam arquivamento. Engine limpa algumas cópias de
  anexos sem referência ativa; existem também cópias de origem (K06).
- Origem (protocolo/host/porta) define os dados disponíveis. Limpar armazenamento
  elimina a cópia local; mudar domínio não migra dados. Não há backup implementado.
- Migrações preservam compatibilidade; atividades antigas sem hora são sinalizadas
  e anexos locais de Memórias podem migrar para o Álbum de forma idempotente.

## Integrações

| Integração      | Uso atual                                                                                                                                                 | Condições                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Geoapify Places | Handler `/api/places` atende função Node compatível e Vite dev/preview; Address Autocomplete, normalização e seleção direta de resultado; fallback manual | Requer `GEOAPIFY_API_KEY` e `ALLOWED_ORIGIN` exata no servidor; segredo nunca vai ao cliente; limitação em memória é por instância |
| Frankfurter     | Câmbio real                                                                                                                                               | Sem chave; cache identificado no IndexedDB e taxa manual em gastos/compras                                                         |
| Open-Meteo      | Clima de sete dias durante viagem                                                                                                                         | Coordenadas salvas; cache; indisponibilidade explícita                                                                             |
| Mapas externos  | Abrir navegação                                                                                                                                           | Preferência local; não solicita GPS do aparelho                                                                                    |
| Supabase        | Desativado                                                                                                                                                | isLocal/isDemo verdadeiros, backendClient nulo; SDK/SQL históricos                                                                 |
| OpenAI/agent    | Ausente no fluxo ativo                                                                                                                                    | Roteamento de modelos é regra de desenvolvimento, não função do aplicativo                                                         |

Vite dev/preview usa o handler server-side compartilhado com a função do host.
Pesquisa Geoapify autenticada foi validada localmente sem expor a chave; Preview
implantado e variáveis do host continuam sem validação nesta etapa.
Condições de deployment constam no [README](../README.md); licenças de assets em
[ASSETS](../ASSETS.md).

## Validação registrada

Auditoria de 06/10/2026, em cópia temporária com dados sintéticos:

- 46/46 testes existentes passaram, em sete arquivos.
- TypeScript principal aprovado com `tsc --noEmit --incremental false`.
- api/places.ts aprovado em checagem separada com TypeScript estrito.
- Build Vite aprovado, com manifest, service worker e precache.
- Na auditoria, três sondagens temporárias confirmaram K02 (coordenadas), K03 e
  K04; regressões duráveis foram adicionadas para K02 e K04 nesta rodada. K03
  permanece dependente de decisão sobre o limite.
- Hashes de 112 arquivos conferidos na auditoria, sem alterações.

Limites: testes Node não certificam UI; teste atual de stores não simula atualização
de banco V1 preenchido para V2. Integrações nos testes usam respostas controladas.
Não houve nova certificação física, visual ou consulta autenticada. A QA de
05/10/2026 registra inspeção desktop mobile de 375/402/440 px e seus limites.
O tsconfig do build inclui src e vite.config.ts, mas não api/places.ts.
Não há script de lint.

## K01 — correção concluída, validada e aprovada em 06/10/2026

TripEditor mantém linhas de viajantes/destinos por identificador, sem reassociar
pelo nome. Renomear/reordenar preserva preferências, estado de convite, transportes,
fusos e subperíodos dentro das datas da viagem. IDs novos são gerados somente
para novas linhas. Metadados gerais existentes também são preservados.

Viajantes agora têm campos individuais com adicionar, subir/descer e remover.
A conta atual permanece na viagem. Remoção com referências ativas em atividades,
gastos, bagagem, itens, checklist ou autoria é bloqueada antes de persistir,
incluindo registros na fila durável de alterações. Registros arquivados são
preservados; referências de outra viagem não bloqueiam a operação.

- 19 regressões novas; suíte completa: **65/65 testes em oito arquivos**.
- `pnpm build`: aprovado, incluindo TypeScript, manifest, SW e precache.
- TypeScript estrito de `api/places.ts`: aprovado separadamente.
- Chrome desktop, perfil temporário e dados sintéticos, em 375/402/440 px:
  salvar sem edição, homônimos, renomear/reordenar, metadados/IDs, isolamento,
  reabertura, salvar offline, remoção com vínculo somente na fila e conflito de
  versão aprovados; sem overflow horizontal ou erros JavaScript.
- `git diff --check`: aprovado; correção autorizada para commit pelo usuário.
- Detalhes e passos de repetição em [QA](QA.md).

Limites: não repara IDs/metadados já perdidos por salvamentos anteriores; não houve
certificação em dispositivo físico nem consulta autenticada ao Google. A edição
local offline foi testada após carregar a página; não é nova certificação de
recarregamento/instalação da PWA offline. Viagens e entidades continuam em stores
separados; a verificação de referências reflete a leitura feita ao salvar, sem
transação única entre localStorage e IndexedDB para alterações entre janelas.
No fechamento de K01, K02–K08 continuavam pendentes; a rodada atual atualiza os
itens K02/K04/K05/K07 descritos abaixo.

## Estabilização incorporada ao checkpoint — 07/10/2026

- **K04 corrigido em `b4c8568`:** abertura em cache só enquanto válida;
  falhas limpam apenas a tentativa correspondente, concorrentes compartilham a
  abertura e conexão tardia após `blocked` é fechada. Sem limpar/recriar o banco.
- **K02 parcialmente corrigido:** editor expõe data final, horário final, código e
  status; edição preserva-os. Atividade vinculada recebe `location`, endereço,
  `providerId` e coordenadas disponíveis. Reservas de vários dias continuam com
  uma única atividade no roteiro, na data inicial.
- **K05 parcialmente corrigido:** Home recarrega fotos quando o evento local de
  mídia informa importação/edição/arquivamento. A contagem de favoritos ainda usa
  `memory.favorite`; o Álbum não oferece o mesmo modelo de favoritos.
- **K07 com Geoapify:** Vite dev/preview e função Node do host usam o mesmo
  handler. Sem chave ou origem configurada, a UI oferece fallback manual.
  Pesquisa real local foi validada; deploy e limites/quota distribuídos dependem
  da configuração do host.

Verificação histórica dessa rodada: `pnpm test` 71/71 em 12 arquivos; TypeScript principal,
checagem estrita separada de `api/places.ts`, `pnpm build` e `git diff --check`
aprovados. Chrome temporário em 402 px criou viagem e confirmou mensagem de Places
sem chave; salvou/reabriu reserva sintética com período, horário final, código e
status. Perfil isolado; nenhum dado pessoal.

## Problemas conhecidos (abertos)

| ID  | Problema e evidência                                                                                                                                                      | Impacto                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| K02 | Corrigidos controles/cópia dos campos e coordenadas; estadia ainda gera uma atividade apenas na data inicial e horário final em dia diferente não vira duração de roteiro | Representação diária da hospedagem no roteiro permanece limitada                                        |
| K03 | Editor ativo aceita período acima de 366 dias; daysOf corta em 366. Sondagem: 730 dias calculados, 366 navegáveis                                                         | Parte do roteiro fica inacessível                                                                       |
| K04 | Resolvido e versionado no checkpoint `b4c8568`                                                                                                                            | Regressão cobre falha transitória, chamadas concorrentes e recuperação                                  |
| K05 | Contagem de fotos atualiza após evento de mídia; favoritos ainda vêm de `memory.favorite`, legado sem equivalente no Álbum                                                | Favoritos desconectados do álbum atual; requer decisão para consolidar                                  |
| K06 | Blobs são gravados antes de concluir formulário, sem limpeza correspondente ao cancelar/substituir/remover referência; cópias source/context                              | Uso de quota por mídia sem referência ativa                                                             |
| K07 | Integração Geoapify e chave server-side verificadas localmente; limite continua por IP/instância em memória, sem quota distribuída                                        | Deploy e variáveis do host ainda aguardam ação manual do usuário; proteção de consumo não é distribuída |
| K08 | Código legado/mocks junto ao ativo; forms/Operations com cerca de 1.200–1.400 linhas; sem teste de UI e migração V1 preenchida; endpoint fora do build tipado             | Manutenção e cobertura insuficientes                                                                    |

Limitações documentadas (não bugs novos): ausência de backup, sincronização,
criptografia dos blobs e certificação física. HEIC depende do navegador; fotos
são comprimidas até 2200 px (não preservam originais); anexos até 10 MB, entradas
de fotos até 30 MB. Não foram encontrados TODO/FIXME/HACK/XXX na auditoria.

## Continuidade

Próximas prioridades e critérios em [ROADMAP](ROADMAP.md). Decisões confirmadas em
[DECISIONS](DECISIONS.md). Questões excepcionais em [ASTRA_QUEUE](ASTRA_QUEUE.md),
sem tarefas. K01 permanece concluído e aprovado. K04 e partes de K02/K05/K07
estão no checkpoint `b4c8568`. O bloco visual V1.2 está em revisão no working
tree, sem commit.

## Handoff externo de UX/UI

[UX_AUDIT_HANDOFF](ux/UX_AUDIT_HANDOFF.md), preparado em 06/10/2026 a partir do
código no commit `6691395`: inventário ativo/legado, navegação, fases da viagem,
recursos e limitações para auditoria externa. Registra Foravento, logo oficial e
identidade aprovada como requisitos futuros da build de identidade V1.2 (D019),
sem aplicar branding ou mudar funcionalidades. K04 estava não iniciado quando o
handoff foi criado; sua correção atual consta acima.

## Preparação manual de Places — histórico de 06/10/2026, provider substituído em 07/10/2026

- `/api/places` exige `GOOGLE_PLACES_API_KEY` server-side e `ALLOWED_ORIGIN`
  igual à origem completa do app (esquema e host, sem caminho/barra final). Valida
  origem exata, sessão, place ID, formato de resposta e coordenadas. Places API
  (New) não é filtrada por tipo e pode consultar tipos disponíveis no catálogo.
- Autocomplete e detalhes normalizam nome, endereço, place ID, localidade, região,
  país e coordenadas. Atividades e reservas guardam o mesmo `PlaceData`; o campo
  manual continua disponível sem serviço, com erro, offline ou sem resultados.
- `pnpm build` agora verifica `api/places.ts` com TypeScript estrito além do app.
  README documenta variáveis, configuração externa de Google Cloud e deploy do
  fonte com função Node; `dist/` isolado não contém nem executa `/api`.
- Testes mockam o provider e cobrem respostas com/sem resultados, formatos
  inválidos, erros e 429, origem/configuração, normalização, coordenadas, offline,
  seleção do detalhe e persistência/reabertura em atividade e reserva.
- A integração real ainda depende da chave e da origem configuradas pelo dono do
  deploy e de publicação manual em host com suporte a função Node. Nenhum deploy
  ou acesso à conta do host foi feito nesta rodada.
- Validação desta rodada: 80/80 testes em 12 arquivos; TypeScript do aplicativo
  e checagem estrita da função aprovados; `pnpm build` e `git diff --check`
  aprovados. O build cliente tem 15 arquivos e não contém nome da variável server
  nem padrões de chaves Google, chaves privadas ou tokens encontrados na varredura.
- ZIP de 101 arquivos inclui fonte, lockfile, configuração da função, testes e
  documentação; exclui dependências, `.git`, ambientes locais, builds, capturas
  pessoais e QA com dados pessoais. Inspeção de caminhos e conteúdo aprovada.

## Migração Places para Geoapify — 07/10/2026

- `/api/places` mantém contrato interno e valida `GEOAPIFY_API_KEY` e `ALLOWED_ORIGIN`
  no servidor. A integração anterior com Google Places foi removida do fluxo de
  pesquisa; Google Maps para navegação externa não foi alterado.
- `api/providers/geoapify.ts` usa Geoapify Address Autocomplete e converte
  nome, endereço formatado, place ID, latitude/longitude, cidade, região, país,
  CEP, categoria e atribuição para o modelo interno. A busca cobre nomes de
  lugares e endereços conforme o catálogo do provider; `LAX` tem alias explícito
  para Los Angeles International Airport.
- Atividades e reservas mantêm o mesmo `PlaceData`; sugestões são selecionadas
  diretamente sem nova chamada de detalhes. O campo permanece editável e aceita
  local manual em erro, ausência de configuração, rate limit ou offline.
- A interface mostra crédito Geoapify e OpenStreetMap próximo a sugestões/locais
  selecionados. Respostas antigas de autocomplete são descartadas por sequência
  de requisição e chamadas anteriores são abortadas.
- Validação real local com chave já configurada, sem expor seu valor: Griffith
  Observatory, Warner Bros Studio, Olive Garden e LAX responderam pelo endpoint;
  LAX foi normalizado ao aeroporto solicitado. Warner Bros e Olive Garden são
  buscas globais/ambíguas: a pessoa deve escolher a unidade correta. Outros
  códigos IATA não têm aliases específicos e podem exigir nome/cidade.
- Fluxo visual sintético: buscar Griffith Observatory, selecionar sugestão,
  salvar atividade e reabri-la preservou nome/endereço; atribuição ficou visível.
  Testes cobrem coordenadas e estrutura completa persistidas em atividade e
  reserva. Dados de conta/viagem foram sintéticos em sessão de navegador isolada.
- A chave continua ausente do bundle por desenho (lida apenas por função server
  side/local Vite middleware). No host manual, configure `GEOAPIFY_API_KEY` e
  `ALLOWED_ORIGIN` conforme README. Nenhum acesso ou deploy à Vercel foi feito.
