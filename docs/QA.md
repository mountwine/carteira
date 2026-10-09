# Travel OS V1.1 — validação de 05/10/2026

## Resultado automatizado

- TypeScript estrito: aprovado (projeto e endpoint `api/places.ts`).
- Vitest: **46 testes aprovados em 7 arquivos**.
- Build Vite: aprovado; manifest, service worker e precache gerados.
- Banco local: evolução para versão 2 preserva stores e dados da versão anterior.

Cobertura nova: ordenação de roteiro por data/horário; horário obrigatório; validações de atividade/reserva/documento e tipos personalizados; fases e Dia X de Y; histórico contextual/scroll; filtros; isolamento de proprietário/viagem; senha derivada/recuperação; migração idempotente de atividade sem horário; transação compra/gasto e atualização sem duplicidade; persistência offline e conflito concorrente; cotação/cache sem valor fictício; EXIF válido e malformado; mídia por viagem/tipo; endpoint Places sem chave; clima/cache sem conexão. Os testes SQL da V1 permanecem como proteção histórica do schema, sem ativar Supabase na V1.1.

## Inspeção funcional mobile

Dados anteriores observados: USA 2027 e SP com Mário permaneceram disponíveis. Foram criadas viagens separadas, QA V1.1 e QA Após, para não alterar registros dessas viagens. Ambas foram arquivadas ao concluir a inspeção; Minhas viagens voltou a exibir as duas viagens originais.

| Fluxo            | Verificação                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sessão e viagens | Recarregar mantém a sessão local e as viagens.                                                                                                                      |
| Nova viagem      | Campos obrigatórios, datas e fallback manual de Places; Concluir acompanha preenchimento.                                                                           |
| Fase automática  | Viagem atual abre Durante, Dia 1 de 4; viagem futura abre Antes. Viagem concluída separada confirmou Depois sem checklist/mala; limites também cobertos no domínio. |
| Atividade        | Nome/local obrigatórios, dia da viagem, wheel de hora/minuto; atividade 20:30 salva.                                                                                |
| Reserva          | Tipo Outros exige descrição; Ferry 13:00 cria reserva e atividade vinculada.                                                                                        |
| Timeline         | Ferry 13:00 aparece antes do jantar 20:30, apesar de ter sido criado depois. Nenhum seletor Calendário/Mapa.                                                        |
| Documentos       | Identidade com nome e imagem salva sem número, país ou validade. Anexo fica no dispositivo.                                                                         |
| Gasto rápido     | Início → + gasto → salvar US$25 → resumo atualiza.                                                                                                                  |
| Mais detalhes    | Categorias ocultas inicialmente; expandir mostra valores, percentuais e barras; recolher preserva resumo.                                                           |
| Compra/gasto     | Compra com foto e quantidade 3; Comprei US$30 cria um único gasto de Compras. Total passa de US$25 para US$55. Atualização de preço/duplicidade coberta no domínio. |
| Álbum            | Importação múltipla de duas imagens de teste; Por data e Destaques.                                                                                                 |
| Foto             | Visualizador modal, próxima/anterior e informações; voltar nativo fecha a foto e retorna ao álbum.                                                                  |
| Viagem global    | Viajantes da QA → seletor USA 2027 mantém seção e passa a mostrar Leo/Maya.                                                                                         |
| Checklist        | Adição inline e marcação: 0% → 100%, Tudo pronto para viajar, com opção de desmarcar mantida.                                                                       |
| Bagagem          | Retorno inclui compra física Camisetas QA ×3, checkbox de retorno e escolha de mala.                                                                                |
| Mais             | Apenas os oito módulos aprovados.                                                                                                                                   |
| Navegação        | Origem contextual exibida; rotas e filtros mantidos entre telas visitadas.                                                                                          |
| Mobile           | Início/Roteiro/Álbum/Mais em 375, 402 e 440 px: largura do documento igual ao viewport e nenhum elemento de conteúdo excedendo a largura.                           |

As imagens usadas na QA são assets públicos do próprio projeto. Nenhuma foto pessoal foi enviada a serviço externo. Os testes não alteram passaportes, anexos pessoais ou compras das viagens anteriores.

## Integrações externas

- Frankfurter: consulta online real respondeu BRL→USD, com data de referência; cache e ausência de cache testados separadamente.
- Open-Meteo: adapter consulta real de sete dias, valida estrutura e oferece cache; cenário sem coordenadas confirmado na Home. Teste automatizado de cache offline usa resposta controlada, sem substituir a integração no app.
- Google Places: proxy implementado e tipado, autocomplete/detalhes compartilhados, segredo exclusivo no servidor. Sem chave/configuração, fallback manual confirmado. **Consulta Google autenticada não foi testada: nenhuma chave foi fornecida.**

## Limites da validação

O navegador desktop com viewport mobile não certifica Safari/Android físico. Ainda devem ser conferidos no iPhone instalado: instalação/atualização, teclado aberto, seleção touch de hora/minuto, safe areas reais, Web Share e gesto de swipe. Swipe de fotos tem implementação por pointer events e alternativas por botões; o teste desta sessão confirmou a alternativa por botões e retorno nativo. PDF no Safari depende do visualizador nativo. HEIC depende de decodificação do navegador.

Não há sincronização entre dispositivos, convite real, exportação/importação de backup nem criptografia dos registros/blobs em repouso. A limpeza dos dados do navegador elimina a cópia local. A alteração do domínio/porta cria outro espaço de armazenamento; migração entre origens ainda não é oferecida.

## Repetir a validação

Use `pnpm test`, `pnpm build` e `pnpm preview --port 5173`. Preserve a origem utilizada anteriormente. Refaça os fluxos da tabela em uma viagem de teste, depois recarregue e teste com conexão desativada. Não limpe o armazenamento como parte da atualização. Para Google Places, configure primeiro as variáveis descritas no README.

## K01 — validação de 06/10/2026

Escopo exclusivo: preservar identidade e metadados ao editar viagem. Dados
sintéticos em Vitest/fake-indexeddb e perfil temporário separado do Chrome;
nenhum banco real ou dado pessoal aberto, migrado ou apagado.

- `pnpm test`: 65/65 testes em oito arquivos, sendo 19 novos em
  `tests/trip-editing.test.ts`. Cobrem homônimos, IDs/metadados, adição/remoção,
  subperíodos, vínculos por tipo/autoria, registros arquivados, isolamento,
  reabertura offline e rejeição de versão desatualizada.
- `pnpm build`: aprovado com TypeScript e geração de PWA.
- Checagem estrita separada de `api/places.ts`: aprovada.
- `git diff --check`: aprovado na validação anterior ao commit.
- pnpm 11 executado com `--config.verify-deps-before-run=false` para rodar os
  scripts com as dependências já instaladas, sem reinstalar/remover node_modules;
  não houve alteração de dependências ou lockfile.

Inspeção automatizada pontual via Playwright/Chrome desktop em **375/402/440 px**:
salvar sem edição, renomear/reordenar homônimos, conferir IDs/preferências/convites,
transportes/fusos/datas, preservar outra viagem, recarregar, editar/salvar offline,
bloquear remoção de viajante com gasto somente na fila durável e rejeitar edição
com versão antiga. Todos passaram, sem overflow horizontal nem erros JavaScript.
Screenshots de 375 e 440 px também foram inspecionados visualmente. O roteiro de
browser foi temporário, não incorporado à suíte Vitest.

Para repetir, use perfil de teste separado e uma viagem sintética com dois
viajantes homônimos e dois destinos de mesma cidade, IDs e metadados diferentes.
Salve sem mudanças; renomeie e reordene cada linha; confira os objetos persistidos
e os vínculos em atividades/gastos/malas. Adicione e remova somente linhas novas
sem vínculos. Remova um viajante vinculado e confirme alerta sem salvar; repita
com vínculo na fila. Reabra e salve offline após carregar a página. Em duas
janelas, salve primeiro em uma e confira que a versão antiga da outra é rejeitada.
Repita em cada largura, preservando a mesma origem de teste.

Limites: não certifica dispositivo físico, instalação/reload da PWA offline,
Google autenticado ou recuperação de metadados perdidos antes da correção.
Não há transação conjunta entre metadados da viagem e entidades; referências são
checadas no momento da leitura ao salvar. Os demais problemas auditados permanecem
abertos. A evidência histórica de 05/10/2026 acima não foi sobrescrita.

## Estabilização funcional — 06/10/2026

Perfil temporário de Chrome, viewport 402 × 844, conta e viagem sintéticas; sem
acessar a origem de navegador pessoal. Na tela de atividade, a pesquisa `/api/places`
mostrou a mensagem de configuração ausente e permitiu fallback manual. A rota
Vite foi consultada separadamente e retornou JSON 503 (`Pesquisa não configurada`),
confirmando que deixou de responder como HTML da SPA. Com o navegador offline, a
UI informou que não havia conexão e manteve a entrada manual disponível. A busca
Google autenticada não pôde ser validada sem chave.

Criada uma viagem de teste; criado e reaberto um hotel de vários dias. A UI mostrou
data final, horário final, código e status; a reserva salva manteve `2026-11-02 →
2026-11-05`, `11:00`, `HTL-001` e status pendente, com vínculo ao roteiro. A seleção
de resultado Google e coordenadas não puderam ser exercitadas ao vivo; testes do
handler e do domínio verificam respostas normalizadas e propagação sintética de
endereço, `providerId` e latitude/longitude à atividade vinculada.

- Vitest: 71/71 testes em 12 arquivos, incluindo recuperação IndexedDB,
  atualização da retrospectiva por evento de mídia, handler Places e vínculo
  reserva/atividade.
- TypeScript principal, checagem estrita separada de `api/places.ts`, build Vite e
  `git diff --check`: aprovados nesta rodada.
- Não testados: autenticação Google, deploy Preview, dispositivo físico, migração
  V1 preenchida para V2, e K03/K06. Nenhum dado pessoal foi alterado e não houve
  limpeza de stores ou blobs.

## Migração Places para Geoapify — 07/10/2026

Consulta real pelo endpoint local `/api/places` com chave já existente no ambiente
local, sem imprimir ou registrar seu valor. Os casos Griffith Observatory,
Warner Bros Studio, Olive Garden e LAX responderam com dados de lugar; o código
LAX foi convertido para o nome completo do aeroporto após a API retornar matches
de baixa relevância para o código isolado. Warner Bros Studio e Olive Garden
retornam múltiplas unidades globais, então a seleção depende da cidade/endereço.

Na interface em perfil de navegador isolado e viewport 402 px, foi criada uma
viagem e pesquisado Griffith Observatory na atividade. A sugestão mostrou endereço
e atribuição Geoapify/OpenStreetMap; selecionar, salvar e reabrir preservou nome e
endereço. Coordenadas, ID, CEP e metadados são cobertos por testes de normalização
e persistência de atividades/reservas. Nenhum dado de navegador pessoal foi lido.

- `pnpm test`: 83/83 testes em 12 arquivos; contrato Geoapify mockado, ausência de
  chave, origem inválida, query curta, sem resultados, resposta inválida, erro de
  rede, 429, normalização, alias LAX, coordenadas, sequência de digitação e
  fallback offline/manual.
- `pnpm typecheck`: aprovado, incluindo checagem estrita separada de `api/places.ts`.
- `pnpm build`: aprovado; busca de texto do bundle não encontrou nome de variável
  server-side nem chave/configuração de credencial.
- `git diff --check`: aprovado.

Não testados nesta rodada: configuração/deploy do host manual, quota/plano real,
todos os códigos IATA, dispositivos físicos e o comportamento offline após reload
da PWA. Não foi acessada a Vercel. Os serviços cobram conforme plano e a limitação
de 60 chamadas por minuto continua local à instância do servidor.
