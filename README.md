# Travel OS — V1.1

Aplicativo pessoal de viagens, local-only, atualizado sobre a V1 existente. React 19, TypeScript, Vite e PWA. Interface Dark com Manrope local, Deep Navy, Electric Blue e tokens centralizados. Não existe conexão ativa com Supabase, OpenAI, Agent, tradução ou colaboração online.

## Executar e testar

Requer Node 22.12+ e pnpm 11.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm preview --port 5173
```

Pare o servidor de desenvolvimento antes de iniciar o preview na mesma porta. Abra `http://localhost:5173`. O preview utiliza o build de produção e seu service worker. **Mantenha o endereço original:** host, protocolo e porta definem o armazenamento do navegador. Trocar de endereço não transfere os dados.

No primeiro acesso, crie uma conta local e guarde a chave de recuperação apresentada. A recuperação funciona neste dispositivo, sem envio de email. Uma sessão válida abre Minhas viagens diretamente. Sessões da V1 são reaproveitadas; em Conta, é possível definir email/senha local sem perder o identificador associado às viagens. Sair preserva os dados.

Para testar: crie uma viagem; adicione atividades em horários fora de ordem; cadastre reserva/documento; registre uma compra e marque Comprei; confira o gasto vinculado e a bagagem de retorno; importe várias fotos; abra uma foto e use Voltar; troque de viagem e confira os viajantes e as listas. Em Gastos, Mais detalhes expande as categorias. Modificar a compra comprada atualiza o mesmo gasto. Confira também uma viagem futura e uma concluída: a fase é calculada pelas datas, sem seletor manual.

Para iPhone/Android instalado, utilize um endereço HTTPS estável. No Safari: Compartilhar → Adicionar à Tela de Início. No Android, utilize a instalação oferecida pelo navegador. Faça o primeiro carregamento online antes de testar sem conexão. A interface não contém botão global de instalação. O teste em dispositivo físico continua necessário para teclado, wheel picker, compartilhamento nativo e safe areas reais.

## O que mudou

- Navegação: Início, Roteiro, +, Álbum, Mais. O + abre quatro ações; não é uma página.
- Histórico contextual com nome da origem, retorno nativo, estado de telas mantido e restauração de scroll quando possível.
- Minhas viagens compacta, ordenada por fase; criação/edição com origem, destinos, datas, viajantes e capa opcional reposicionável.
- Início automático: preparação com checklist/bagagem inline; durante com próxima atividade, previsão, gastos e reservas do dia; depois com retrospectiva e compras.
- Roteiro apenas timeline, sempre ordenado por data e horário; novos registros exigem nome, dia, horário e local.
- Places compartilhado entre viagem, atividade e reserva, com fallback manual explícito.
- Álbum Por data/Destaques, blobs comprimidos e thumbnails, leitura de EXIF DateTimeOriginal, visualizador, edição e compartilhamento/download.
- Reservas/Documentos com dropdowns, tipos personalizados e arquivos locais. Compras com fotos, gasto vinculado e retorno da bagagem com quantidade/opt-out.
- Conversor com cotação online/cache, unidades físicas, calçados masculino/feminino e referências de vestuário por marca; navegação externa com preferência local.
- Mais contém somente Bagagem, Reservas, Documentos, Viajantes, Gastos, Compras, Conversor e SOS. SOS não oferece atalho direto 911.

## Arquitetura e arquivos principais

`src/domain`: modelos, validações, fases, ordenação, conversões e mutações. `src/adapters/local.ts`: autenticação e viagens locais. `src/data`: repositório, IndexedDB, arquivos, mídia, journal de gravação e resolução de conflitos. `src/adapters/external.ts`: Places, câmbio e clima. `src/app`: contexto selecionado e histórico; mudar viagem remonta seu contexto e isola os registros. `src/components/local.tsx` e `LocalEditors.tsx`: formulários compartilhados. `src/styles/tokens.css` e `v11.css`: tokens e apresentação mobile. `api/places.ts`: endpoint Vercel, sem armazenamento de viagens no servidor.

Metadados pequenos de viagens, sessão e preferências permanecem no localStorage por compatibilidade; entidades, contas derivadas, imagens, anexos e caches ficam no IndexedDB. Compras e seus gastos são gravados em uma única transação, com vínculo estável e proteção contra duplicidade. Alterações concorrentes em entidades têm controle de versão; conflitos ficam disponíveis para revisão. Não há fila para sincronização remota. Os aliases internos legados `isDemo`/`backendClient` apenas mantêm compatibilidade com o repositório da V1: o primeiro seleciona armazenamento local e o segundo é nulo. Nenhum cliente remoto é construído.

Novos destinos sem fuso verificado usam o relógio do aparelho; fusos explícitos anteriores são preservados, inclusive ao reordenar destinos. Não se inventa um fuso pelo nome da cidade.

A senha usa PBKDF2/SHA-256, sal aleatório e 210.000 iterações; não se grava senha em texto. A chave de recuperação também é derivada. Essa autenticação local não equivale a um cofre criptografado: blobs/registros não são cifrados. Não há backend de contas.

As fronteiras de dados e stores versionados permitem uma futura exportação/importação `.travelos`. **Backup/importação não foram implementados nesta rodada.**

## Migração da V1

- Banco `travel-os-v1`: versão 1 → 2; acrescenta `accounts`, `media`, `settings`, preservando stores anteriores.
- Mantém identificadores de sessão/proprietário, viagens antigas, participantes, registros, arquivos e preferências. Junta metadados legados sem recriar seed.
- Atividades antigas sem horário permanecem preservadas e são sinalizadas para edição; não recebem um horário inventado.
- Fotos de Memórias com anexos locais acessíveis são importadas para o Álbum de forma idempotente, preservando os documentos originais. Anexo remoto ausente neste dispositivo não pode ser recuperado sem sua origem; nenhum dado é apagado para contornar isso.
- Exclusões de viagens/fotos arquivam registros. Não se limpa localStorage/IndexedDB para atualizar. Feche janelas antigas se bloquearem a mudança de versão do banco.
- Dados de demonstração já existentes continuam como registros anteriores; a V1.1 não gera novos dados fictícios automaticamente e não transforma documentos fictícios antigos em documentos válidos.

A cópia original do código da V1 foi preservada fora do projeto. Cópia de código não é backup dos dados do navegador.

## Integrações e variáveis na Vercel

O funcionamento local não exige variáveis de ambiente.

| Variável | Local | Uso |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | somente servidor Vercel | Chave real de Google Places API (New). Nunca usar prefixo `VITE_`. |
| `ALLOWED_ORIGIN` | somente servidor Vercel | Origem exata permitida, ex.: `https://seu-projeto.vercel.app`. |
| `VITE_PLACES_ENDPOINT` | frontend, opcional | Padrão `/api/places`; preferir endpoint na mesma origem. Não contém segredo. |

Na Vercel, selecione a pasta deste projeto, framework Vite, build `pnpm build`, saída `dist`, Node compatível. Adicione as variáveis em Settings → Environment Variables nos ambientes desejados e gere um novo deployment. Habilite Places API (New) e faturamento no projeto Google; restrinja a chave a essa API. O endpoint fornece autocomplete e detalhes; aplica validação, timeout, limite básico por IP/instância e origem configurada. O limite em memória não é uma quota global/distribuída: configure quotas no Google Cloud para controlar custos.

O servidor Vite/preview sozinho não executa funções Vercel. Sem endpoint/chave, o formulário informa que a pesquisa não está configurada e aceita local manual. Nesse caso, coordenadas/país normalizado podem não existir; não se inventam sugestões. Com API, seleção salva nome, endereço, cidade, região, país, coordenadas e ID disponíveis. O código nunca pede localização GPS do aparelho. Antes de ativar um provider em produção, seu uso offline/armazenamento precisa respeitar a licença contratada; o adapter permite substituí-lo sem alterar os registros de viagem. Consulte as [políticas do Places](https://developers.google.com/maps/documentation/places/web-service/policies).

[Câmbio Frankfurter](https://frankfurter.dev/) e [clima Open-Meteo](https://open-meteo.com/en/docs) usam APIs reais sem chave nesta implementação. Câmbio guarda taxa, data de referência e horário de consulta; offline reutiliza cache identificado. Sem cache, conversão fica indisponível e gastos/compras aceitam taxa informada. Nenhum valor hardcoded substitui cotação. Clima consulta coordenadas salvas durante a viagem e guarda previsão de sete dias; sem coordenadas/conexão/cache, mostra indisponibilidade. Cotação não inclui IOF/spread.

Referências de tamanhos utilizam a [tabela Nike](https://static.nike.com.br/web/prd/tabela-de-medidas.html), explicitamente identificada por marca; anéis incluem medidas físicas e acesso ao [guia Pandora](https://us.pandora.net/en/guide-size-rings/guide-size-rings.html). Não se promete equivalência universal entre marcas.

## Validação e limites

Consulte `docs/QA.md`. Build de produção e testes passam; inspeção mobile cobriu 375, 402 e 440 px. Autocomplete Google com chave real ainda depende de configuração; fallback e contrato do endpoint foram testados. Compartilhamento nativo/instalação no iPhone físico não foram certificados nesta sessão. JPEG/PNG/WebP funcionam; HEIC depende da decodificação nativa do navegador. EXIF de JPEG fornece data/hora quando válido; localização GPS EXIF não é extraída. Imagens são comprimidas a até 2200 px, não constituindo arquivo de originais. Anexos: até 10 MB; fotos de entrada: até 30 MB. Armazenamento depende da quota do dispositivo/navegador.

Os módulos retirados foram arquivados fora do projeto, em work/v1.1/legacy. Tipos compatíveis e migrações SQL permanecem como referência histórica da V1, fora das rotas ativas. Não há mocks silenciosos nas novas consultas externas, nem convites reais: o formulário de convite apenas comunica a indisponibilidade de colaboração.
