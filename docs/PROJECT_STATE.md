# Estado técnico — Travel OS V1.1

Atualizado em 06/10/2026. Referência funcional: baseline
`7f1cc01c3bcb0fe61f5f6ceadcbf65085d6322c4`, branch `main`.
Esta atualização cria apenas documentação de continuidade; não corrige bugs.

## Fonte e limites

Baseado na auditoria de 06/10/2026, código, testes, README e [QA histórica](QA.md)
de 05/10/2026. Código e testes prevalecem sobre este resumo. “Aparentemente
funcional” indica leitura e testes aplicáveis, não certificação de todos os fluxos.
A auditoria não abriu o aplicativo com dados pessoais nem alterou banco real.

## Arquitetura

SPA mobile em português brasileiro: React 19, TypeScript estrito, Vite e PWA.
Tema escuro, Manrope local e tokens centralizados. Node >=22.12.0, pnpm 11.19.0.
Dependências: Lucide, Supabase SDK, Leaflet, Workbox e vite-plugin-pwa; testes com
Vitest, fake-indexeddb e PGlite. Ter dependência instalada não significa uso ativo.

| Local | Responsabilidade |
|---|---|
| src/app | Sessão, histórico, seleção de viagem e composição de telas |
| src/features | Viagens, início, roteiro, álbum e ferramentas |
| src/components | Formulários compartilhados, controles e mídia |
| src/domain | Modelos, validações, fases, conversões e mutações |
| src/data | IndexedDB, repository, engine, journal, arquivos e mídia |
| src/adapters | Autenticação/viagens locais, preferências e serviços externos |
| api/places.ts | Proxy Vercel para Google Places; não guarda viagens |
| supabase | Schema, RLS, RPCs e migrações históricas da V1 |
| public | Fotos de referência, fonte, licenças e ícones PWA |
| tests | Domínio, banco, offline, mídia e endpoint; há testes junto a src |
| docs | Estado, continuidade e evidências de QA |

App.tsx e Workspace.tsx definem o fluxo ativo. Telas visitadas permanecem montadas;
trocar de viagem remonta o contexto. Engine usa alterações otimistas, journal local,
controle de versão, receipts e revisão de conflitos; repository usa IndexedDB e
BroadcastChannel. Não há sincronização remota ativa.

## Funcionalidades

| Área | Estado | Escopo e limitações |
|---|---|---|
| Conta local | Implementada/aparentemente funcional | Cadastro, login, edição e recuperação por chave local; sem email |
| Minhas viagens | Parcial | Criação, edição, ordenação por fase e arquivamento; K01/K03 |
| Início | Parcial | Antes/durante/depois, preparação, próxima atividade, clima e retrospectiva; K05 |
| Roteiro | Implementado/aparentemente funcional | Timeline, horários, conflitos, duplicação, mover dia e edição; K03/K02 |
| Reservas | Parcial | Tipos, anexos, local e atividade vinculada; faltam controles de campos relevantes; K02 |
| Documentos | Implementados/aparentemente funcionais | Anexos locais, visualização, download e tipos personalizados; K06 |
| Gastos | Implementados/aparentemente funcionais | Orçamento, categorias, divisão e taxas registradas; base de cálculo USD |
| Compras | Implementadas/aparentemente funcionais | Wishlist, fotos, compra e gasto vinculados em transação; K06 |
| Bagagem/checklist | Implementados/aparentemente funcionais | Malas, pesos, itens de ida/retorno, compras físicas e preparação |
| Álbum | Implementado/aparentemente funcional | Importação múltipla, EXIF JPEG, edição, visualizador e compartilhar/download |
| Conversor | Implementado/aparentemente funcional | Câmbio/cache, unidades e referências de tamanhos por marca |
| SOS | Implementado/aparentemente funcional | Seguro, contatos, cartão pessoal, hospedagem e documentos essenciais; K02 |
| Busca e navegação | Implementadas/aparentemente funcionais | Busca local, retorno contextual, Apple Maps/Google Maps/Waze externos |
| Amigos/viajantes | Parcial | Registros locais; amigos podem ser adicionados/listados; sem colaboração |
| PWA | Implementada, validação parcial | Manifest, precache e atualização; instalação/uso físico pendentes |
| Convites entre dispositivos | Não implementados | Interface informa indisponibilidade; código legado não é convite real ativo |
| Backup/importação .travelos | Documentados, não implementados | Sem restauração independente da origem do navegador |
| Sincronização/conta online | Não implementadas no fluxo ativo | Supabase desativado; sem backend de contas |
| IA/tradução livre | Não implementadas no fluxo ativo | Sem integração OpenAI/agent ativa |

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

| Integração | Uso atual | Condições |
|---|---|---|
| Google Places | Autocomplete/detalhes via /api/places | GOOGLE_PLACES_API_KEY e ALLOWED_ORIGIN no servidor; frontend opcional VITE_PLACES_ENDPOINT; fallback manual |
| Frankfurter | Câmbio real | Sem chave; cache identificado no IndexedDB e taxa manual em gastos/compras |
| Open-Meteo | Clima de sete dias durante viagem | Coordenadas salvas; cache; indisponibilidade explícita |
| Mapas externos | Abrir navegação | Preferência local; não solicita GPS do aparelho |
| Supabase | Desativado | isLocal/isDemo verdadeiros, backendClient nulo; SDK/SQL históricos |
| OpenAI/agent | Ausente no fluxo ativo | Roteamento de modelos é regra de desenvolvimento, não função do aplicativo |

Vite dev/preview não executa a função Vercel. Não houve teste autenticado Google
na auditoria. Nenhuma chave foi adicionada. Condições de deployment constam no
[README](../README.md); licenças de assets em [ASSETS](../ASSETS.md).

## Validação registrada

Auditoria de 06/10/2026, em cópia temporária com dados sintéticos:

- 46/46 testes existentes passaram, em sete arquivos.
- TypeScript principal aprovado com `tsc --noEmit --incremental false`.
- api/places.ts aprovado em checagem separada com TypeScript estrito.
- Build Vite aprovado, com manifest, service worker e precache.
- Três sondagens temporárias confirmaram K02 (coordenadas), K03 e K04.
  Elas não foram adicionadas ao repositório; criar regressões duráveis ao corrigir.
- Hashes de 112 arquivos conferidos na auditoria, sem alterações.

Limites: testes Node não certificam UI; teste atual de stores não simula atualização
de banco V1 preenchido para V2. Integrações nos testes usam respostas controladas.
Não houve nova certificação física, visual ou consulta autenticada. A QA de
05/10/2026 registra inspeção desktop mobile de 375/402/440 px e seus limites.
O tsconfig do build inclui src e vite.config.ts, mas não api/places.ts.
Não há script de lint.

## Problemas conhecidos (abertos)

| ID | Problema e evidência | Impacto |
|---|---|---|
| K01 | TripEditor associa membros/cidades por nome, redefine preferences/transport e pode gerar IDs ao renomear; análise de código | Perda de metadados e referências anteriores a viajantes |
| K02 | LocalReservationEditor não oferece término, horário final, código/status; novos términos iguais ao início. reservationChanges não copia coordenadas/local; este último reproduzido | Hospedagem atual e integração ao roteiro incompletas |
| K03 | Editor ativo aceita período acima de 366 dias; daysOf corta em 366. Sondagem: 730 dias calculados, 366 navegáveis | Parte do roteiro fica inacessível |
| K04 | database guarda Promise rejeitada após falha de abertura, sem nova tentativa na mesma página; reproduzido | Recuperação depende de recarregamento |
| K05 | LocalHome carrega fotos apenas por trip.id e usa memory.favorite na retrospectiva; análise de código | Contagem desatualizada e favoritos desconectados do álbum atual |
| K06 | Blobs são gravados antes de concluir formulário, sem limpeza correspondente ao cancelar/substituir/remover referência; cópias source/context | Uso de quota por mídia sem referência ativa |
| K07 | Places aceita ausência de Origin; limite por IP/instância em memória, sem quota distribuída | Proteção limitada contra consumo do endpoint |
| K08 | Código legado/mocks junto ao ativo; forms/Operations com cerca de 1.200–1.400 linhas; sem teste de UI e migração V1 preenchida; endpoint fora do build tipado | Manutenção e cobertura insuficientes |

Limitações documentadas (não bugs novos): ausência de backup, sincronização,
criptografia dos blobs e certificação física. HEIC depende do navegador; fotos
são comprimidas até 2200 px (não preservam originais); anexos até 10 MB, entradas
de fotos até 30 MB. Não foram encontrados TODO/FIXME/HACK/XXX na auditoria.

## Continuidade

Próximas prioridades e critérios em [ROADMAP](ROADMAP.md). Decisões confirmadas em
[DECISIONS](DECISIONS.md). Questões excepcionais em [ASTRA_QUEUE](ASTRA_QUEUE.md),
inicialmente sem tarefas. Nenhum problema acima foi corrigido nesta etapa.
