# Registro de decisões — Travel OS / Foravento

Atualizado em 06/10/2026. Registra somente escolhas comprovadas no projeto ou
confirmadas pelo usuário. Arquitetura vigente não implica preferência por mantê-la
para sempre; uma mudança exige decisão explícita e referência que a substitua.
Bugs, tarefas e propostas pertencem a PROJECT_STATE/ROADMAP, não a este registro.

## D001 — Base técnica vigente

- Estado: vigente, comprovado no projeto; registrado em 06/10/2026.
- Decisão: React 19, TypeScript estrito, Vite e PWA; pnpm e lockfile versionado.
- Evidência: package.json, tsconfig.json, vite.config.ts, pnpm-lock.yaml.
- Consequência: seguir essa base sem substituir ferramentas fora do escopo pedido.

## D002 — Persistência e autenticação locais na V1.1

- Estado: vigente, comprovado no projeto; registrado em 06/10/2026.
- Decisão: serviços ativos locais; viagens/sessão em localStorage, entidades,
  contas e blobs em IndexedDB. Senha e recuperação derivadas, sem email remoto.
- Evidência: src/adapters/index.ts, local.ts, runtime.ts e src/data/database.ts.
- Consequência: Supabase/agent legados não constituem integração ativa. Não registra
  decisão sobre backend futuro, sincronização ou criptografia a implementar.

## D003 — Preservação e consistência dos registros

- Estado: vigente; comprovado no código e reforçado pelo usuário em 06/10/2026.
- Decisão: preservar dados/identificadores, migrações compatíveis e isolamento;
  compra/gasto vinculados em transação e revisão de conflitos. Exclusões de
  viagens/fotos usam arquivamento. Operações destrutivas exigem autorização.
- Evidência: domain/mutations.ts, planning.ts, data/repository.ts, engine.ts,
  features/TripEditor.tsx, Album.tsx e instrução do usuário nesta conversa.
- Consequência: defeitos de preservação conhecidos são violações a corrigir, não
  justificativa para limpar armazenamento ou recriar dados.

## D004 — Segredo de Places somente no servidor

- Estado: vigente, comprovado no projeto; registrado em 06/10/2026.
- Decisão: GOOGLE_PLACES_API_KEY no endpoint Vercel; frontend recebe apenas a
  configuração pública VITE_PLACES_ENDPOINT. Usar fallback manual quando ausente.
- Evidência: api/places.ts, adapters/external.ts, .env.example e README.
- Consequência: não colocar chaves em código/frontend ou variáveis VITE_.

## D005 — Consultas externas com indisponibilidade explícita

- Estado: vigente, comprovado nos adapters ativos; registrado em 06/10/2026.
- Decisão: câmbio/clima usam serviços reais e cache identificado; sem cotação
  fictícia silenciosa. Novos destinos sem fuso verificado usam o aparelho.
- Evidência: adapters/external.ts, domain/models.ts, TripEditor.tsx e README.
- Consequência: mocks históricos não substituem consultas no fluxo ativo.

## D006 — Baseline e rastreabilidade Git

- Estado: confirmado pelo usuário em 06/10/2026.
- Decisão: versionar o estado atual antes de alterações funcionais e revisar
  exclusões de dependências/builds/ambientes/credenciais antes do primeiro commit.
- Evidência: baseline `7f1cc01c3bcb0fe61f5f6ceadcbf65085d6322c4`, branch main,
  com mensagem `chore: baseline do Travel OS V1.1`, e aprovação nesta conversa.
- Consequência: manter diffs rastreáveis, preservar alterações alheias e criar
  commits quando autorizados. Nenhum remoto foi configurado nesta etapa.

## D007 — Continuidade documental

- Estado: política e estrutura técnica aprovadas pelo usuário em 06/10/2026.
- Decisão: ler estado/decisões/roadmap antes de trabalho relevante; código e
  testes prevalecem sobre resumo de implementação. Atualizar estado, decisões e
  prioridades após mudanças relevantes e executar validação pertinente.
- Evidência: pedido de criação deste sistema na conversa.
- Consequência: decisões permanentes exigem evidência/confirmação; não inferir
  preferências de produto. Detalhes ficam em docs; AGENTS permanece conciso.

## D008 — Uso econômico e seletivo de modelos

- Estado: política confirmada pelo usuário em 06/10/2026.
- Decisão: recomendar menor modelo/esforço suficiente antes de cada tarefa;
  modelos econômicos para trabalho mecânico, Sol para implementação/raciocínio
  intermediário/avançado e Astra para questões excepcionais de alto impacto.
- Evidência: instruções de roteamento de IA do usuário nesta conversa.
- Consequência: diagnosticar contexto/ambiente antes de escalar, agrupar questões
  em ASTRA_QUEUE e preparar pacote mínimo. Recomendações não trocam automaticamente
  o modelo do Codex nem disparam revisões; respeitar autorização do usuário.
- Referência auxiliar: [seleção de modelos — OpenAI Docs](https://developers.openai.com/api/docs/guides/model-selection).
  A tabela em AGENTS é política deste projeto, não promessa de preço ou disponibilidade.

## Decisões de produto confirmadas

Fonte de D009–D018: instrução explícita do usuário nesta conversa, em 06/10/2026.
Confirmação da direção de produto não significa implementação concluída nem
autoriza mudanças funcionais nesta etapa. Estado atual em [PROJECT_STATE](PROJECT_STATE.md);
trabalho futuro em [ROADMAP](ROADMAP.md).

### D009 — Nome Foravento

- Estado: confirmado; substituição futura.
- Decisão: o nome provisório Travel OS será substituído por **Foravento**.
- Estado atual: código, interface e baseline ainda usam Travel OS.
- Consequência: registrar o novo nome como destino da identidade, sem afirmar
  que a renomeação já foi aplicada.

### D010 — Preservar arquitetura funcional

- Estado: confirmado; diretriz vigente.
- Decisão: preservar a arquitetura funcional atual. A mudança de identidade
  não justifica reescrever o aplicativo.
- Consequência: aplicar identidade sobre a base existente, preservando dados,
  vínculos e comportamento; correções auditadas continuam sendo trabalho separado.

### D011 — Somente modo escuro por enquanto

- Estado: confirmado; vigente por enquanto.
- Decisão: o aplicativo continuará somente em modo escuro.
- Estado atual: o fluxo ativo força o tema escuro; tipos legados de tema não
  representam suporte ativo a outras aparências.
- Consequência: não adicionar modo claro/automático como parte da nova identidade.
  A expressão “por enquanto” permite futura decisão explícita que substitua esta.

### D012 — Início da identidade visual na V1.2

- Estado: confirmado; marco futuro.
- Decisão: a nova identidade visual do Foravento começará a ser aplicada na V1.2.
- Estado atual: baseline funcional é Travel OS V1.1, sem essa aplicação.
- Consequência: planejar a transição sem declarar implementação ou fechamento
  completo da identidade na V1.2. Logo, paleta e demais detalhes não foram definidos.

### D013 — Viajantes da viagem selecionada

- Estado: confirmado; requisito de produto.
- Decisão: Viajantes deve mostrar somente pessoas pertencentes à viagem
  atualmente selecionada no dropdown da Home.
- Estado atual: LocalTravelers lê os membros da viagem do contexto selecionado.
- Consequência: preservar e validar esse isolamento ao trocar de viagem; não
  misturar contatos ou participantes de outras viagens.

### D014 — Contexto mínimo em Viajantes

- Estado: confirmado; adequação futura a verificar.
- Decisão: o nome da viagem é contexto suficiente na tela Viajantes; não é
  necessário repetir todas as informações da viagem.
- Estado atual: a tela usa o contexto selecionado e há nome no cabeçalho global;
  a apresentação final deve ser conferida contra este requisito.
- Consequência: evitar duplicação de destinos, datas e demais dados da viagem.

### D015 — Conteúdo útil do SOS, sem atalho 911

- Estado: confirmado; requisito a preservar.
- Decisão: manter seguro, hospedagem, documentos e contatos úteis no SOS, sem
  atalho dedicado para 911.
- Estado atual: essas áreas estão presentes e não há atalho dedicado para 911;
  identificação de hospedagem ainda sofre a limitação K02.
- Consequência: preservar o conteúdo e corrigir consistência sem reinserir esse atalho.

### D016 — Escopo do Conversor

- Estado: confirmado; cobertura parcialmente existente.
- Decisão: contemplar moeda, distância/comprimento, peso e referências de roupas
  e calçados masculinos e femininos.
- Estado atual: moeda/unidades e calçados masculinos/femininos existem; referências
  de roupas exibidas são Nike masculina, sem cobertura feminina equivalente.
- Consequência: manter o que existe e planejar a lacuna de roupas femininas;
  referências devem continuar identificadas por marca, sem equivalência universal.

### D017 — Tradutor e Viajantes permanecem no produto

- Estado: confirmado; permanência de produto.
- Decisão: Tradutor e Viajantes permanecem como funcionalidades do produto.
- Estado atual: Viajantes tem tela local ativa; Tradutor não tem tela ativa nem
  tradução livre implementada, embora existam phrasebook/adapters legados.
- Consequência: não excluir essas áreas do escopo de produto. Provider, operação
  online/offline, interface e versão de entrega do Tradutor ainda não foram definidos.

### D018 — Duas navegações principais no Álbum

- Estado: confirmado; adequação futura parcial.
- Decisão: navegação cronológica semelhante a galeria e navegação imersiva com
  fotos percorridas horizontalmente. Abrir foto deve ampliá-la e oferecer ações
  como compartilhamento.
- Estado atual: há Por data/Destaques e visualizador ampliado com anterior/próxima,
  gesto horizontal e compartilhar/download. “Destaques” não comprova por si só uma
  segunda navegação principal imersiva conforme a direção confirmada.
- Consequência: preservar recursos existentes e avaliar/adequar a segunda forma
  de navegação; não declarar a experiência futura integralmente implementada.

## Como acrescentar decisões

Usar ID estável, data, estado (vigente/substituída), decisão, fonte de confirmação
e consequências. Ao substituir, preservar o registro anterior e vincular o novo.
Não registrar propostas pendentes como aprovadas. D009–D018 são decisões de produto
confirmadas; suas lacunas de implementação continuam abertas. As restrições da
etapa atual não são proibições permanentes.
