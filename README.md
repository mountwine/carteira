# Foravento — V1.2 em implantação

Aplicativo pessoal de viagens sobre a base funcional Travel OS V1.1. A interface V1.2 começou pelo cabeçalho, navegação global e Minhas Viagens; as demais telas seguem em atualização. React 19, TypeScript, Vite e PWA. Interface somente escura, com Archivo e Manrope locais e tokens da Rodada 04. Não existe conexão ativa com Supabase, OpenAI, Agent, tradução ou colaboração online.

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
- Minhas viagens em cards horizontais por fase, com capa opcional, datas, quantidade de viajantes e estado da viagem; criação/edição preserva origem, destinos, datas e capa reposicionável.
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

Ao editar viagens, cada viajante e destino mantém seu identificador, inclusive com nomes repetidos e ao renomear/reordenar. Viajantes têm campos individuais e ações para adicionar, reordenar e remover; preferências, estado do convite e vínculos existentes são preservados. A conta atual não pode ser removida. A remoção de viajante com registros ativos vinculados (incluindo alterações pendentes) é bloqueada no salvamento, sem apagar esses registros. Destinos preservam transportes, fusos e datas dentro do período da viagem.

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

## Configuração da pesquisa de lugares

A pesquisa online usa Geoapify Address Autocomplete pela função server-side
`api/places.ts`. A interface depende somente do contrato interno `/api/places`;
o adaptador Geoapify fica em `api/providers/geoapify.ts`, separado dos formulários.
O host deve executar funções Node para `/api/*`; publicar apenas `dist/` não
fornece esse endpoint. O mesmo handler é exercitado pelo middleware Vite dev/
preview. Sem configuração ou conexão, os campos continuam aceitando locais
manualmente. Nenhuma variável secreta usa o prefixo `VITE_`.

| Variável               | Obrigatória?          | Finalidade                                                                                 | Onde configurar                                                | Exemplo seguro                                                                       |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `GEOAPIFY_API_KEY`     | Sim para busca online | Chave do Geoapify Address Autocomplete, usada somente pelo servidor                        | Ambiente server-side do host e, para teste local, `.env.local` | Valor secreto criado em Geoapify MyProjects; não use um valor de exemplo em produção |
| `ALLOWED_ORIGIN`       | Sim para busca online | Autoriza exatamente a origem que carrega o app e configura CORS                            | Ambiente server-side do host e, para teste local, `.env.local` | `https://foravento.example`                                                          |
| `VITE_PLACES_ENDPOINT` | Não                   | Sobrescreve o endpoint interno padrão. Deixe vazio para usar `/api/places` na mesma origem | Ambiente de build; é pública e não pode conter segredo         | vazio; ou endpoint próprio com CORS configurado                                      |

`ALLOWED_ORIGIN` deve ser a origem final exibida na barra do navegador, contendo
esquema (`https://`) e domínio, sem caminho, query, fragmento ou barra final. Por
exemplo, se o endereço do app for `https://foravento.example/viagens`, configure
`https://foravento.example`. Se o host der um domínio temporário e você testar
por ele, configure essa origem nesse ambiente; ao conhecer/usar o domínio final,
substitua pelo domínio final e gere um novo build/deploy conforme o host exigir.
Para desenvolvimento local, use a origem real do Vite, por exemplo
`http://localhost:5173`. Uma origem diferente, inclusive `www` ou domínio de
preview, recebe 403. A API exige chave e origem válida. Não configure a chave
em variável `VITE_*`.

### Configuração do Geoapify

1. Crie ou selecione um projeto em [Geoapify MyProjects](https://myprojects.geoapify.com/).
2. Abra **API Keys**, crie uma chave e habilite **Address Autocomplete API**. A implementação chama `GET https://api.geoapify.com/v1/geocode/autocomplete` em formato GeoJSON com limite de oito resultados e idioma português, conforme a [documentação oficial](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/).
3. Proteja a chave com as restrições compatíveis com o host e consulte os limites/consumo do plano escolhido. A chave fica somente no servidor.
4. No ambiente local `.env.local`, defina `GEOAPIFY_API_KEY` e `ALLOWED_ORIGIN`. No ambiente de hospedagem, configure ambas como variáveis server-side para Preview e Production conforme necessário.
5. Teste o endpoint e a pesquisa no aplicativo conforme “Verificação depois do deploy”.

`.env.local` é ignorado pelo Git. Não mostre, copie para outros arquivos, versione ou inclua nele/deploy algum log com o valor da chave; não registre a chave em código, bundle, URL do frontend ou documentação. A autenticação do Geoapify exige a key como parâmetro na chamada provider-to-provider, feita exclusivamente pelo servidor.

O handler valida a origem, consultas e respostas, usa timeout, aplica limite básico de 60 chamadas por minuto por IP/instância e não armazena dados de viagem. Esse limite em memória não é global; monitore a cota no painel Geoapify. A busca é livre e pode retornar lugares e endereços indexados, incluindo restaurantes, atrações, hotéis, aeroportos e pontos de referência; resultados e detalhes dependem da cobertura do catálogo. Cada solicitação de autocomplete é uma chamada cobrada conforme o plano.

**Atribuição:** a interface mostra `Powered by Geoapify` e `© OpenStreetMap contributors` junto às sugestões e aos locais selecionados. Geoapify exige atribuição OpenStreetMap; o crédito Geoapify também é obrigatório no plano gratuito. Os links aparecem próximos do local fornecido pelo serviço. Os termos também requerem manter a atribuição da fonte junto aos dados armazenados ou torná-la visível ao reutilizá-los ([termos Geoapify](https://www.geoapify.com/terms-and-conditions/)).

### Build e hospedagem manual

Use Node `>=22.12.0` e pnpm `11.19.0`. Extraia o ZIP e use a raiz do projeto. Configure build `pnpm build`, diretório estático `dist` **e** função Node `/api/places` (`api/places.ts`). O `vercel.json` mantém as rotas SPA fora de `/api`. Em Settings → Environment Variables, crie `GEOAPIFY_API_KEY` como variável secreta e `ALLOWED_ORIGIN` com a origem final exata nos ambientes de Preview/Production desejados; depois gere um deployment para aplicar a configuração. Se ainda não souber a URL final, publique inicialmente sem busca habilitada para obter o domínio, configure `ALLOWED_ORIGIN` com esse domínio e publique novamente. A ausência da chave ou origem mantém `/api/places` desabilitado com resposta 503. Um host apenas estático não executará a função.

**Verificação depois do deploy:** substitua `https://foravento.example` pela URL efetiva e execute `curl -i -H 'Origin: https://foravento.example' 'https://foravento.example/api/places?q=Restaurante'`. Com configuração válida, a resposta deve ser HTTP 200 e JSON `{ "places": [...] }` (uma lista vazia também é válida). HTTP 503 indica configuração ausente; 403 indica origem diferente; 429 indica limite temporário; 502 indica erro do provider ou resposta inválida. Em seguida, no app conectado, pesquise locais, selecione um resultado, salve uma atividade e uma reserva e reabra cada item para conferir nome, endereço, coordenadas e código postal quando fornecidos. Teste também digitar um local manualmente com a busca online indisponível. Nunca coloque a chave em comandos, URLs, capturas de tela ou registros.

Sem chave configurada, o formulário informa que a pesquisa não está configurada e aceita local manual. Com a API, seleção pode salvar nome, endereço, cidade, região/estado, país, código postal, categoria, coordenadas, ID e atribuição quando disponíveis. O código não solicita a localização GPS do aparelho. Dados Google existentes não são migrados nem apagados nesta troca de provider.

[Câmbio Frankfurter](https://frankfurter.dev/) e [clima Open-Meteo](https://open-meteo.com/en/docs) usam APIs reais sem chave nesta implementação. Câmbio guarda taxa, data de referência e horário de consulta; offline reutiliza cache identificado. Sem cache, conversão fica indisponível e gastos/compras aceitam taxa informada. Nenhum valor hardcoded substitui cotação. Clima consulta coordenadas salvas durante a viagem e guarda previsão de sete dias; sem coordenadas/conexão/cache, mostra indisponibilidade. Cotação não inclui IOF/spread.

Referências de tamanhos utilizam a [tabela Nike](https://static.nike.com.br/web/prd/tabela-de-medidas.html), explicitamente identificada por marca; anéis incluem medidas físicas e acesso ao [guia Pandora](https://us.pandora.net/en/guide-size-rings/guide-size-rings.html). Não se promete equivalência universal entre marcas.

## Validação e limites

Consulte `docs/QA.md`. Build de produção, TypeScript e testes passam; inspeção mobile cobriu 375, 402 e 440 px. A integração Geoapify foi validada com chave local e dados sintéticos, além de testes mockados do contrato e fallback. Compartilhamento nativo/instalação no iPhone físico não foram certificados nesta sessão. JPEG/PNG/WebP funcionam; HEIC depende da decodificação nativa do navegador. EXIF de JPEG fornece data/hora quando válido; localização GPS EXIF não é extraída. Imagens são comprimidas a até 2200 px, não constituindo arquivo de originais. Anexos: até 10 MB; fotos de entrada: até 30 MB. Armazenamento depende da quota do dispositivo/navegador.

Os módulos retirados foram arquivados fora do projeto, em work/v1.1/legacy. Tipos compatíveis e migrações SQL permanecem como referência histórica da V1, fora das rotas ativas. Não há mocks silenciosos nas novas consultas externas, nem convites reais: o formulário de convite apenas comunica a indisponibilidade de colaboração.
