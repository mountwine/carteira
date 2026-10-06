# Travel OS V1.1 — validação de 05/10/2026

## Resultado automatizado

- TypeScript estrito: aprovado (projeto e endpoint `api/places.ts`).
- Vitest: **46 testes aprovados em 7 arquivos**.
- Build Vite: aprovado; manifest, service worker e precache gerados.
- Banco local: evolução para versão 2 preserva stores e dados da versão anterior.

Cobertura nova: ordenação de roteiro por data/horário; horário obrigatório; validações de atividade/reserva/documento e tipos personalizados; fases e Dia X de Y; histórico contextual/scroll; filtros; isolamento de proprietário/viagem; senha derivada/recuperação; migração idempotente de atividade sem horário; transação compra/gasto e atualização sem duplicidade; persistência offline e conflito concorrente; cotação/cache sem valor fictício; EXIF válido e malformado; mídia por viagem/tipo; endpoint Places sem chave; clima/cache sem conexão. Os testes SQL da V1 permanecem como proteção histórica do schema, sem ativar Supabase na V1.1.

## Inspeção funcional mobile

Dados anteriores observados: USA 2027 e SP com Mário permaneceram disponíveis. Foram criadas viagens separadas, QA V1.1 e QA Após, para não alterar registros dessas viagens. Ambas foram arquivadas ao concluir a inspeção; Minhas viagens voltou a exibir as duas viagens originais.

| Fluxo | Verificação |
|---|---|
| Sessão e viagens | Recarregar mantém a sessão local e as viagens. |
| Nova viagem | Campos obrigatórios, datas e fallback manual de Places; Concluir acompanha preenchimento. |
| Fase automática | Viagem atual abre Durante, Dia 1 de 4; viagem futura abre Antes. Viagem concluída separada confirmou Depois sem checklist/mala; limites também cobertos no domínio. |
| Atividade | Nome/local obrigatórios, dia da viagem, wheel de hora/minuto; atividade 20:30 salva. |
| Reserva | Tipo Outros exige descrição; Ferry 13:00 cria reserva e atividade vinculada. |
| Timeline | Ferry 13:00 aparece antes do jantar 20:30, apesar de ter sido criado depois. Nenhum seletor Calendário/Mapa. |
| Documentos | Identidade com nome e imagem salva sem número, país ou validade. Anexo fica no dispositivo. |
| Gasto rápido | Início → + gasto → salvar US$25 → resumo atualiza. |
| Mais detalhes | Categorias ocultas inicialmente; expandir mostra valores, percentuais e barras; recolher preserva resumo. |
| Compra/gasto | Compra com foto e quantidade 3; Comprei US$30 cria um único gasto de Compras. Total passa de US$25 para US$55. Atualização de preço/duplicidade coberta no domínio. |
| Álbum | Importação múltipla de duas imagens de teste; Por data e Destaques. |
| Foto | Visualizador modal, próxima/anterior e informações; voltar nativo fecha a foto e retorna ao álbum. |
| Viagem global | Viajantes da QA → seletor USA 2027 mantém seção e passa a mostrar Leo/Maya. |
| Checklist | Adição inline e marcação: 0% → 100%, Tudo pronto para viajar, com opção de desmarcar mantida. |
| Bagagem | Retorno inclui compra física Camisetas QA ×3, checkbox de retorno e escolha de mala. |
| Mais | Apenas os oito módulos aprovados. |
| Navegação | Origem contextual exibida; rotas e filtros mantidos entre telas visitadas. |
| Mobile | Início/Roteiro/Álbum/Mais em 375, 402 e 440 px: largura do documento igual ao viewport e nenhum elemento de conteúdo excedendo a largura. |

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
