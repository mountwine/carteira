# Foravento — handoff para auditoria externa de UX/UI

**Data:** 06/10/2026. **Base examinada:** Travel OS V1.1, commit
`6691395c616fa30134af85ef73d2614c3eda7370` (K01 concluído).
**Escopo:** descrever o produto atual para avaliação externa, sem propor redesign,
implementar identidade visual ou iniciar K04. Não inclui dados pessoais ou credenciais.

O produto passa a se chamar **Foravento** por decisão aprovada. A interface e os
artefatos instaláveis atuais ainda usam **Travel OS**; a troca pertence à V1.2.
Este documento descreve código e documentação, sem nova inspeção de interface nesta
etapa. “Implementado” não significa certificação em todos os dispositivos.

## 1. Como interpretar o estado

| Classificação | Significado neste handoff |
|---|---|
| **IMPLEMENTADO** | Existe no fluxo ativo e é acessível pela interface atual. Limites operacionais são indicados separadamente. |
| **PARCIAL** | Existe no fluxo ativo, mas tem lacuna de cobertura, comportamento ou integração identificada. |
| **PLANEJADO** | Direção futura confirmada ou proposta explicitamente identificada; ainda não é um recurso disponível. Não implica prazo ou autorização para implementar. |
| **LEGADO OU NÃO UTILIZADO** | Código, tipos ou telas presentes no repositório, sem acesso no fluxo ativo examinado. Quando algum dado legado ainda é lido, isso é indicado. |

Fontes de continuidade: [estado técnico](../PROJECT_STATE.md),
[decisões](../DECISIONS.md), [roadmap](../ROADMAP.md) e [QA histórica](../QA.md).
Código e testes prevalecem quando houver divergência.

## 2. Stack, plataforma e arquitetura atual

**IMPLEMENTADO:** aplicação web SPA em português brasileiro, orientada a uso mobile,
com React 19, TypeScript estrito e Vite. Pode executar no navegador e como PWA
instalada; não há aplicativo nativo separado. O tema ativo é somente escuro.
A apresentação atual usa Manrope local, fundo navy, azul de ação, cards e tokens CSS.
Lucide e emojis compõem ícones; existem estilos para safe areas e unidades de viewport.
Esses estilos não comprovam adequação a aparelhos físicos.

A base usa Node >=22.12 e pnpm 11.19.0. Vitest, fake-indexeddb e PGlite dão suporte
a testes de domínio/persistência e schema histórico. SDK Supabase e Leaflet estão
instalados, mas isso não representa conta remota ou mapa interno ativo.

| Camada | Papel e consequência para UX |
|---|---|
| `src/app/App.tsx` e `Workspace.tsx` | Sessão, viagem selecionada, histórico, modais e montagem de telas; definem o inventário realmente acessível. |
| `src/features` | Home, viagem, roteiro, operações, álbum e ferramentas. |
| `src/components` | Cards, páginas, modais, formulários, seletores de data/hora/moeda, autocomplete e mídia. |
| `src/domain` | Fases da viagem, modelos, validações, cálculos, vínculos e preservação de identidades. |
| `src/data` | IndexedDB, arquivos/fotos, leitura por viagem/proprietário, gravação local, fila durável e revisão de conflitos. |
| `src/adapters` | Autenticação/viagens locais, preferências, Places, câmbio e clima. |
| `api/places.ts` | Proxy de busca de locais no servidor Vercel; não armazena viagens. |

**IMPLEMENTADO:** viagens/membros, sessão e preferências em localStorage; entidades,
contas locais, anexos, mídia, cache e journal em IndexedDB `travel-os-v1` versão 2.
Telas visitadas permanecem montadas, ocultas quando inativas. Trocar de viagem
remonta o contexto e isola os registros. A engine apresenta alterações otimistas,
controle de versão, fila local, feedback e revisão; não sincroniza com a nuvem.

**LEGADO OU NÃO UTILIZADO:** backend Supabase, SQL/RLS/RPCs e estruturas de agent
permanecem como histórico. O serviço ativo usa autenticação e viagens locais;
`backendClient` é nulo. Não há OpenAI ou IA ativa no aplicativo.

## 3. Navegação atual e mapa

**IMPLEMENTADO:** sem sessão, o acesso oferece Entrar, Criar conta e Recuperar senha.
Com sessão, abre **Minhas viagens**. Selecionar uma viagem abre **Início**.

A barra inferior contém **Início / Roteiro / + / Álbum / Mais**.
“+” abre um menu de **Adicionar atividade, compra, gasto ou foto**, sem tela própria.
No cabeçalho, o nome/dropdown troca a viagem; a lupa abre Busca e o avatar abre o
menu da conta. O dropdown pertence ao cabeçalho global, não exclusivamente à Home.

```text
Entrar / Criar conta / Recuperar senha
                 │
           Minhas viagens ── Nova/Editar viagem (modal)
                 │           Entrar com convite (parcial)
           Viagem selecionada
                 │
       ┌─────────┼─────────┬──────────┐
     Início    Roteiro    Álbum      Mais
                 │         │         ├─ Bagagem
                 │         │         ├─ Reservas
                 │         │         ├─ Documentos
                 │         │         ├─ Viajantes
                 │         │         ├─ Gastos
                 │         │         ├─ Compras
                 │         │         ├─ Conversor
                 │         │         └─ SOS
           Editor de    Foto ampliada
           atividade    / editar / compartilhar

Cabeçalho global:
  Dropdown → trocar viagem (mantém seção compatível; reinicia seu contexto)
  Lupa → Busca → registro na tela correspondente
  Avatar → Conta / Minhas viagens / Amigos / Configurações / Sair
Barra “+” → editores de Roteiro / Compras / Gastos ou importação no Álbum
Aviso de gravação/conflito → Revisar alterações locais
```

Relações implementadas entre telas:

- Início → Roteiro pela próxima atividade; → Reservas pelas reservas do dia;
  → Gastos pelo atalho de registro; → Bagagem pelo retorno; após a viagem,
  → Álbum, Gastos e Compras.
- Reserva → documento anexado e roteiro; atividade → reserva vinculada.
- Compra realizada → gasto vinculado e bagagem de retorno.
- SOS → hospedagem em Reservas e documentos essenciais em Documentos.
- Busca → Roteiro, Reservas, Documentos, Gastos, Compras, Bagagem ou Início,
  conforme o tipo de registro. Não muda a viagem para buscar em todas as viagens.

**IMPLEMENTADO:** navegação contextual registra a origem e posição de scroll;
retorno usa histórico do navegador. Trocar aba inferior redefine a raiz do histórico
interno. Trocar viagem mantém a seção quando compatível e zera foco/histórico.
Reabrir o aplicativo não restaura automaticamente toda a navegação: a sessão e
viagens persistem, e o roteiro tem preferência de último dia por viagem.

Formulários e detalhes usam modais/dialogs, inclusive menus na parte inferior.
Viagem, atividade, reserva e documento têm confirmação de descarte quando sujos;
não presumir a mesma proteção para todos os editores. Há alertas, estados vazios,
feedback temporário e opção Desfazer para operações suportadas pela engine.

## 4. Inventário de telas, modos e sobreposições

| Tela ou superfície | Estado | Recursos acessíveis / observações |
|---|---|---|
| Acesso: login, cadastro e recuperação | IMPLEMENTADO | Nome/email/senha local, chave de recuperação, erros e carregamento; sem envio de email. |
| Minhas viagens | IMPLEMENTADO / PARCIAL | Lista por Em andamento, Próximas e Anteriores; datas, viajantes, capa, abrir/editar, nova viagem, estado vazio. Períodos longos têm K03. |
| Nova/Editar viagem | IMPLEMENTADO | Nome, origem, destinos reordenáveis, datas, moeda, viajantes por linha, capa local/reposicionamento, arquivamento confirmado. K01 preserva IDs e metadados. |
| Início (Home) | PARCIAL | Conteúdo automático antes/durante/depois; preparação, próximo compromisso, clima ou retrospectiva. K05 na retrospectiva. |
| Roteiro | IMPLEMENTADO / PARCIAL | Dias, timeline, atividade, edição do ritmo do dia, concluir/reabrir, duplicar, mover, conflitos, navegação externa. K02/K03 e campos sem controle ativo. |
| Álbum | IMPLEMENTADO / PARCIAL | Por data/Destaques, importação, foto ampliada, anterior/próxima, gesto horizontal, editar, compartilhar/download, arquivar. Direção imersiva futura ainda não integralmente atendida. |
| Mais | IMPLEMENTADO | Os oito módulos do mapa, agrupados em Viagem, Dinheiro & compras e Segurança. |
| Reservas | PARCIAL | Tipos/filtros, cards, anexos, local e atividade vinculada; lacunas de período/código/status e transmissão de coordenadas. |
| Documentos | IMPLEMENTADO | Tipos/filtros, anexos, edição, visualização, download e arquivamento; arquivos locais e etiquetas de privacidade. |
| Gastos | IMPLEMENTADO | Orçamento, categorias, taxa registrada, pagador/divisão, saldos entre viajantes, edição e exclusão. |
| Viajantes | IMPLEMENTADO / PARCIAL | Lista somente da viagem selecionada e adicionar registro local; não é colaboração/convite real. |
| Bagagem | IMPLEMENTADO | Viajante, malas, pesos/limites, itens, ida/retorno e compras de volta. |
| Compras | IMPLEMENTADO | Wishlist/Comprados, dados/fotos de produto, confirmar compra, gasto atômico e relação com mala. |
| Busca | IMPLEMENTADO / PARCIAL | Busca local por texto/tipo e abertura de registros; exemplo de “salvos” não corresponde à cobertura atual. |
| Conversor | IMPLEMENTADO / PARCIAL | Moedas, unidades e tabelas; vestuário feminino ainda não coberto. |
| SOS | IMPLEMENTADO / PARCIAL | Seguro, contatos, consulado, cartão em inglês, documentos e hospedagem; K02 afeta hospedagem. |
| Conta | IMPLEMENTADO | Nome/email, configurar senha para conta legada, informação de acesso local. A recuperação é feita no acesso. |
| Amigos | PARCIAL | Adicionar/listar nomes de contatos locais por proprietário; não compartilha viagens. |
| Configurações | IMPLEMENTADO | Aplicativo padrão de navegação e aviso de armazenamento local; não tem seleção ativa de tema. |
| Revisar alterações locais | IMPLEMENTADO | Estado de gravação, tentar novamente, comparar versões e descartar/reaplicar alteração. Nome interno Sincronização não indica serviço remoto. |
| Entrar com convite | PARCIAL | Campo/código validado e mensagem de indisponibilidade; nenhum ingresso entre dispositivos. |
| Sobreposições auxiliares | IMPLEMENTADO | Troca de viagem, menu da conta, Adicionar, previsão de sete dias, editor do dia, mover atividade, Comprei, orçamento, documento, foto, exclusões e chave de recuperação. |

“IMPLEMENTADO / PARCIAL” distingue recursos presentes de lacunas específicas,
sem afirmar que todo o módulo está concluído frente às decisões futuras de produto.

## 5. Fases da viagem e Home atual

**IMPLEMENTADO:** a fase é calculada pelas datas e pelo relógio no fuso do destino,
quando salvo; sem fuso verificado, usa o aparelho. Não existe seletor manual de
Antes/Durante/Depois no fluxo ativo. Início e fim são inclusivos para Durante.
A aplicação atualiza sua referência de horário a cada minuto.

| Fase | Home acessível e comportamento |
|---|---|
| **Antes** | Capa, nome, datas, destinos e contagem de dias restantes; checklist e bagagem inline com progresso, três itens iniciais, expandir/recolher, marcar/desmarcar, adicionar e editar. Checklist ganha classes de urgência conforme a proximidade. |
| **Durante** | Nome/cidade, data e Dia X de Y; próxima atividade ainda não concluída com horário igual/posterior ao atual, Navegar e Ver detalhes; mensagem quando não há próxima. Previsão compacta/sete dias, gastos de hoje e atalho de gasto, reservas que começam hoje, checklist; nos últimos dias, Organizar retorno. |
| **Depois** | “Memórias da viagem”, dias/destinos, atividades concluídas como lugares visitados, contagem de fotos e favoritos, acesso ao Álbum, gastos totais e compras realizadas; também mostra registros antigos de Memórias. Não há checklist de preparação nesse modo. |

**PARCIAL:** K05: fotos da retrospectiva são carregadas por ID da viagem e podem
ficar desatualizadas após alterações no Álbum; favoritos são contados a partir de
`memory.favorite` legado, não de favoritos do Álbum atual. A Home não identifica
automaticamente atividade “em execução”: seu destaque usa a regra de próxima.
As “reservas de hoje” filtram a data de início, não todo o período de estadia.
Sem coordenadas, a previsão informa que é preciso selecionar um local com coordenadas.

## 6. Roteiro

**IMPLEMENTADO:** faixa de dias, escolha de data e timeline ordenada por data/hora.
Atividades exibem título, horário, endereço, observações, indicação de fixo quando
presente, concluir/reabrir, editar/arquivar, duplicar e mover dia. Há abertura de
mapa externo e relação com reserva. A tela pode posicionar o próximo compromisso
no dia atual. Ritmo do dia tem Leve, Equilibrado ou Intenso e notas no editor.

**IMPLEMENTADO:** novo/editar atividade exige nome, dia dentro da viagem, horário
e local; oferece observações e autocomplete/fallback manual. Horário usa seletor
por roda. Registros antigos sem horário são preservados e sinalizados para revisão.
Conflitos e deslocamentos são calculados localmente; o deslocamento de carro é
uma **estimativa**, não rota real, trânsito ou integração de transporte.

**PARCIAL:** duração, participantes e fixo existem no modelo, mas não têm controles
no editor ativo `LocalActivityEditor`; valores anteriores são preservados e novos
registros usam defaults do código. Não confundir campos do editor genérico antigo
com capacidades acessíveis. K03 limita os dias navegáveis a 366, embora o editor
ativo de viagem aceite períodos maiores. K02 prejudica local/coordenadas de
atividades geradas a partir de reservas. Não há alternância ativa Calendário/Mapa.

## 7. Reservas e documentos

**PARCIAL — Reservas:** filtro por tipo (voo, hospedagem, transporte, restaurante,
ingresso, outros/customizados); cards ordenados por data/hora com status, intervalo,
local, código, valor e notas quando armazenados. Criar/editar oferece nome, tipo,
data, horário inicial, local, preço/moeda, anexo, detalhes e Adicionar ao roteiro.
Anexar documento cria/vincula confirmação; Ver documento abre Documentos.

K02: o editor não oferece data/horário de término, código ou status. Novas reservas
ficam confirmadas e têm término na data inicial; dados de períodos anteriores são
preservados quando compatíveis. Integração ao roteiro existe, mas não copia o
local estruturado/coordenadas. Isso afeta estadias de vários dias, contexto da
Home/SOS e navegação. Exibir esses campos em cards não significa poder editá-los.

**IMPLEMENTADO — Documentos:** cadastrar nome/tipo, tipo personalizado, anexo e
observações; número, país emissor e datas podem ser informados, mas não são todos
obrigatórios. Anexo é necessário em novos documentos no editor ativo. Filtros por
tipo; visualização de imagem, texto ou iframe/PDF e download. Novos documentos
desse editor são privados e essenciais; documentos anexados por outros fluxos
podem ter visibilidade da viagem. Não há controle ativo de visibilidade/essencial
nesse editor. Labels “Só eu”/“Viagem” refletem registros, sem compartilhamento remoto.
Documentos fictícios antigos permanecem identificados; não são documentos válidos.

## 8. Gastos, compras e bagagem

**IMPLEMENTADO — Gastos:** registrar título, data, valor/moeda, taxa para USD,
categoria, pagador, divisão entre viajantes e notas; editar/arquivar. Orçamento
total e limites por categoria, progresso e restante/excedente. “Mais detalhes”
expande categorias. Saldos mostram quanto cada viajante tem a receber/deve ao grupo;
não há pagamento ou transferência financeira integrada.

Cálculo interno usa taxas registradas para USD; exibição do orçamento pode usar
outra moeda mediante cotação. Sem cotação para exibição, informa totais em USD e
saldo indisponível. Gastos/compras permitem taxa informada quando necessário;
cotação de referência não inclui IOF/spread. A moeda da viagem não altera sozinha
a base interna de cálculo.

**IMPLEMENTADO — Compras:** Wishlist/Comprados, título, marca, loja, link, prioridade,
tamanho, preço estimado/alvo, moeda, peso, quantidade, notas e fotos locais.
“Comprei” informa preço real/moeda e eventual taxa manual; confirmação grava compra
e gasto vinculados na mesma operação, sem duplicar o gasto ao repetir. Editar
compra realizada mantém o vínculo. É possível incluir/excluir da bagagem de retorno,
associar mala e abrir link externo do produto. Arquivar compra também arquiva gasto
vinculado. Fotos de compras são distintas do Álbum.

**IMPLEMENTADO — Bagagem:** seleção de viajante da viagem; Arrumar para ir/voltar;
malas de mão/despachadas/mochilas, limite e peso medido. Itens têm categoria,
quantidade, peso unitário, viajante e mala; marcar ida e volta separadamente.
Exibe peso estimado por itens e aviso de excesso. No retorno inclui compras físicas
não excluídas, preparado para retorno, escolher mala e itens sem mala.
Compras sem mala são registros da viagem; não inferir propriedade pessoal delas
só pela seleção de viajante. Remover mala desassocia itens/compras, sem apagá-los.

## 9. Viajantes e contatos

**IMPLEMENTADO:** Viajantes usa exclusivamente membros da viagem selecionada e
exibe nomes com “Registro local”; pode adicionar nome com ID novo. O nome da viagem
aparece no contexto global e no cabeçalho da página. Edição/reordenação/remoção de
membros ocorre no editor da viagem, não em uma ficha completa de perfil.

K01 preserva IDs, preferências e estados de convite em edições, inclusive homônimos.
Não permite remover a conta atual; bloqueia salvar remoção de viajante com registros
ativos vinculados, incluindo a fila durável. Não recupera perdas anteriores à correção.

**PARCIAL:** não há colaboração real, conta remota por viajante, aceite de convite
ou troca entre dispositivos. Amigos é outra lista, vinculada ao proprietário local,
e não equivale a viajantes da viagem ou a compartilhar acesso.

## 10. Álbum, busca, conversor e SOS

### Álbum

**IMPLEMENTADO:** importação múltipla, galeria Por data em mosaico e Destaques com
fotos/legendas. Ambas usam fotos da viagem; “Destaques” lista fotos, sem seleção
atual de favoritas. Ordem por data, horário e criação. Foto abre ampliada em modal;
anterior/próxima, setas do teclado e gesto horizontal percorrem fotos ciclicamente.
Toque pode ocultar controles. Informações mostram data/hora, local e legenda;
editar permite data, local e legenda. Compartilhar usa Web Share quando suportado,
senão prepara download. Excluir arquiva a foto.

EXIF JPEG pode preencher data/hora; local GPS EXIF não é extraído. Sem data válida,
usa data de referência da importação, que nos fluxos ativos pode ser a data do
contexto da viagem. Imagens são comprimidas para até 2200 px e thumbnail de 420 px;
não preservam o arquivo original integral. HEIC depende da decodificação do navegador.

**PARCIAL / PLANEJADO:** já há galeria cronológica e percurso horizontal no
visualizador. Não está comprovada uma segunda navegação principal imersiva integral
como determinada em D018. Essa direção não equivale automaticamente a “Destaques”
existente, nem tem versão de entrega definida.

### Busca

**IMPLEMENTADO:** lupa no cabeçalho; busca local na viagem por texto normalizado,
tokens e indícios de tipo. Cobre atividades, reservas, compras, documentos, gastos,
malas, itens de bagagem e checklist; abre a tela correspondente com foco no registro.
Não consulta internet, todas as viagens, fotos ou pessoas.

**PARCIAL:** exemplo “restaurantes salvos em Los Angeles” sugere cobertura que não
existe no mapeamento atual de resultados: `saved` não possui destino ativo na busca;
`placeMatches` está vazio. O parser não é tradução, IA ou busca semântica. IDs de
checklist abrem Início, sem comprovar um editor dedicado por foco nesse fluxo.

### Conversor

**IMPLEMENTADO:** moeda (Frankfurter), distância, comprimento, peso, temperatura,
volume e consumo; valor, unidades e inversão. Bagagem oferece kg/lb e cm/in.
Referências Nike de calçados masculinos/femininos, camisas/camisetas/calças/roupas
masculinas; anel calcula circunferência pelo diâmetro e aponta guia Pandora.
Referências são aproximadas e identificadas por marca, sem equivalência universal.

**PARCIAL / PLANEJADO:** vestuário feminino é lacuna frente a D016. Moeda offline
precisa de cotação em cache; sem cache, a conversão não está disponível. Unidades
físicas e tabelas locais não exigem internet; links das fontes exigem.

### SOS

**IMPLEMENTADO:** seguro/apólice/telefone, contato pessoal, notas médicas,
consulado/embaixada com diretório externo, cartão pessoal em inglês, hospedagem
confirmada na data do contexto e documentos essenciais. Telefones usam links `tel:`.
Editar informações pessoais salva registro privado. Cartão em inglês é texto
revisado pelo usuário, sem tradução automática. Não existe atalho dedicado para 911.

**PARCIAL:** hospedagem depende das reservas/períodos (K02). Diretório consular
requer internet; contatos salvos ficam locais. O formulário possui número local
informável, mas a tela não oferece atalho dedicado para esse campo. Não inferir
cobertura automática de números de emergência por país.

## 11. Offline, integrações e limites de dados

| Recurso / integração | Estado e condição de uso |
|---|---|
| App/PWA offline | IMPLEMENTADO / validação parcial: shell em cache após carregamento online em produção, aviso de offline e atualização disponível. Instalação manual pelo navegador; sem botão global de instalação. HTTPS/origem estável para uso instalado. |
| Registros e arquivos locais | IMPLEMENTADO: leitura/edição locais, anexos importados e fotos independem de nuvem. Fila durável/revisão protegem gravação, sem envio para servidor. Arquivo remoto legado não disponível localmente pode continuar inacessível. |
| Google Places | IMPLEMENTADO condicionado à configuração: autocomplete/detalhes via proxy Vercel e chave no servidor; sem serviço/conexão, texto manual, sem inventar coordenadas ou fuso. Vite dev/preview não executa o endpoint Vercel. Consulta Google autenticada não certificada. |
| Frankfurter | IMPLEMENTADO: cotação real, cache identificado e referência/data; sem cache/conexão pode ficar indisponível. Taxa manual disponível nos registros de gastos/compras. |
| Open-Meteo | IMPLEMENTADO: previsão de sete dias durante a viagem, por coordenadas, com cache identificado; ausência de local/cache informa indisponibilidade. |
| Apple Maps / Google Maps / Waze | IMPLEMENTADO: navegação por endereço/coordenadas em aplicativo/site externo, com preferência local; não solicita GPS do aparelho. Capacidade offline do mapa depende do serviço externo. |
| Compartilhar / telefonar / sites de referência | IMPLEMENTADO condicionado ao navegador/dispositivo: Web Share ou download, `tel:`, Nike/Pandora/Itamaraty e links de produto. Não garantem operação de destinos externos sem conexão. |
| Supabase / OpenAI / agent | LEGADO OU NÃO UTILIZADO / ausente do fluxo ativo: não há conta cloud, sincronização, tradução livre ou planejamento com IA. |

Dados pertencem à origem (protocolo/host/porta) e ao armazenamento local do navegador.
Sair preserva os dados; limpar armazenamento pode eliminar a única cópia. Não há
backup/exportação/importação implementados. Trocar domínio para a nova marca não
transfere dados por si só; o handoff não define uma mudança de domínio.

Senha/chave de recuperação são derivadas localmente; registros/blobs não são
criptografados em repouso. “Só eu” é filtragem de acesso local, não cofre criptografado.
Anexos até 10 MB e fotos de entrada até 30 MB; armazenamento depende da quota.
Não há comprovação de preservação do histórico de navegação ao fechar/reabrir.

## 12. Lacunas conhecidas e recursos incompletos

| ID / área | Estado | Consequência relevante para a auditoria |
|---|---|---|
| K01 | IMPLEMENTADO, concluído | Edição preserva identidade/metadados; 19 regressões. Não recupera perdas anteriores. |
| K02 | PARCIAL, aberto | Reserva sem controles de término/código/status; local/coordenadas não propagados integralmente ao roteiro; hospedagem/intervalos incompletos. |
| K03 | PARCIAL, aberto | Viagem pode exceder os 366 dias navegáveis no roteiro. |
| K04 | PARCIAL, aberto; não iniciado | Falha de abertura do IndexedDB permanece retida na mesma página; pode exigir recarregamento. |
| K05 | PARCIAL, aberto | Contagem de fotos/favoritos da retrospectiva não acompanha integralmente Álbum atual. |
| K06 | PARCIAL, aberto | Anexos/mídia podem ocupar quota sem referência após cancelamentos/substituições; não há política completa de limpeza. |
| K07 | PARCIAL, aberto | Proteção do endpoint Places limitada; disponibilidade/configuração e controle de consumo precisam revisão. |
| K08 | PARCIAL, aberto | Legado junto ao ativo; cobertura durável de UI e migração V1 preenchida insuficiente; endpoint fora do TypeScript do build principal. |
| Busca, atividade, conversor e convites | PARCIAL | Lacunas específicas descritas nas seções anteriores; presença no modelo ou em texto não garante capacidade acessível. |
| Persistência entre stores | PARCIAL | Viagem e entidades não compartilham transação entre localStorage/IndexedDB; checagem de vínculo reflete a leitura ao salvar. |
| Validação de plataforma | PARCIAL | Inspeções anteriores em 375/402/440 px desktop; não certificam teclado, safe areas, instalação/update, swipe e compartilhamento reais de iPhone/Android. |

Evidência anterior, não executada novamente nesta tarefa documental: **65 testes
aprovados em oito arquivos**, build/PWA e endpoint tipado aprovados para K01.
Ver [QA](../QA.md) para datas, alcance e limites. Não tomar aprovação de testes
Node como avaliação de usabilidade, acessibilidade ou qualidade visual.

## 13. Futuro confirmado e itens sem implementação

### Obrigatório na futura implementação da identidade — V1.2

**PLANEJADO, decisão confirmada pelo usuário em 06/10/2026:** a próxima build que
implementar a nova identidade visual deve integrar:

1. **Foravento** em substituição a **Travel OS** na interface.
2. **Nova logo oficial do Foravento**.
3. **Identidade visual aprovada**, sem inventar uma identidade alternativa.
4. Atualização posterior dos elementos de marca relacionados: nome exibido,
   ícones, splash/PWA e demais pontos de branding aplicáveis.

A aplicação deve preservar a arquitetura funcional e os dados existentes; a
marca não justifica reescrita. O produto permanece somente escuro por enquanto.
D009–D012 e D019 em [DECISIONS](../DECISIONS.md) registram a direção e sua atualização.
O início da identidade é V1.2; não há data de entrega ou definição de todos os
marcos posteriores de branding. Este handoff **não implementa nenhuma troca**.

Pontos atuais de marca comprovados: título HTML (`index.html`), acesso/carregamento
(`Auth.tsx`/`App.tsx`), textos de configurações, manifest/name/short_name/theme e
ícones PWA (`vite.config.ts`, `public/icon-192.png`, `public/icon-512.png`). Os
arquivos oficiais novos e especificações aprovadas de Foravento não foram
identificados no material examinado. O requisito é confirmado; a disponibilidade
dos artefatos para aplicá-lo não está comprovada.

### Outras decisões e propostas — não confundir com entrega V1.2

| Área | Classificação e trabalho futuro |
|---|---|
| Viajantes | IMPLEMENTADO + requisito confirmado: manter somente membros da viagem selecionada; nome basta como contexto (D013/D014); não repetir todas as informações da viagem. |
| SOS | IMPLEMENTADO + requisito confirmado: preservar seguro/hospedagem/documentos/contatos, sem 911 dedicado (D015); corrigir lacunas de reservas separadamente. |
| Conversor | PLANEJADO, confirmado: completar referências de roupas/calçados masculinos e femininos mantendo moeda/unidades (D016). Lacuna atual: vestuário feminino. |
| Tradutor | PLANEJADO, permanência confirmada (D017); sem tela ativa/tradução livre. Provider, operação online/offline, interface e versão de entrega não definidos. |
| Álbum | PLANEJADO, confirmado: duas navegações principais, cronológica e imersiva horizontal, com foto ampliada e ações (D018). Recursos atuais são parcialmente convergentes; adequação completa ainda não comprovada. |
| Convites / colaboração / sincronização remota | PLANEJADO somente como intenção/estrutura histórica, sem contrato de produto e implementação ativos aprovados. Não prometer disponibilidade futura ou prazo. |
| Backup/importação `.travelos` | PLANEJADO como proposta técnica do roadmap, não como escopo de implementação aprovado; atualmente ausente. |
| Demais decisões abertas | Não presumir limites de duração, favoritos, retenção de mídia, operação do Tradutor ou versões de entrega. |

## 14. Legado ou não utilizado no fluxo examinado

**LEGADO OU NÃO UTILIZADO:** `Today`, `HomeConnected`, `Travelers`/`Profile` antigos,
`TripActions`, `Notifications`, `TravelMap`, adapters demo/Supabase e `domain/agent`.
Tipos de telas como Tradutor/Mapa/Perfil não comprovam rotas atuais. `ChecklistScreen`
e `Memories` existem em Operations, mas não são mapeadas pelo Workspace ativo.
Checklist inline da Home é ativo; dados antigos de Memórias ainda aparecem na Home
Depois e podem migrar fotos locais de forma idempotente para o Álbum.

O catálogo/phrasebook/mocks em `providers` não é descoberta de lugares ou tradutor
ativo; sua ponte de câmbio é usada e delega ao serviço real. Seeds históricos são
usados por testes; o fluxo atual não gera uma nova viagem demonstrativa sozinho.
CSS/tipos de modo claro/automático e campos de perfil antigos não oferecem tema
alternativo na aplicação ativa.

## 15. O que não pode ser concluído somente pelo código

- Usabilidade observada, tempo/erros para concluir tarefas, compreensão de termos,
  prioridades dos usuários, público validado e objetivos de cada perfil: não há
  pesquisa, entrevistas ou métricas de uso suficientes no material examinado.
- Qualidade visual real, contraste medido, leitura, hierarquia, áreas de toque,
  foco/ordem de tabulação, leitor de tela e eficácia de mensagens: implementação
  de CSS/labels/dialogs não substitui inspeção e testes com usuários.
- Comportamento físico de teclado, roda de horário, safe areas, instalação/update,
  swipe, compartilhar e PDF/HEIC no Safari/Android: continua pendente de teste real.
- Escalabilidade da experiência com muitas viagens/centenas de fotos, quota do
  aparelho, recuperação após interrupção e condições extremas: não certificadas
  pela leitura de código ou pelas amostras anteriores.
- Configuração real do deployment, Google autenticado, latência/restrições dos
  providers e experiência em conexão instável: código não comprova ambiente ativo.
- Artefatos oficiais da logo/identidade aprovada e apresentação de splash futura:
  requisito confirmado, materiais e resultado visual não determinados nesta tarefa.

## 16. Referências diretas para conferência técnica

- [App e navegação](../../src/app/App.tsx), [telas ativas](../../src/app/Workspace.tsx),
  [rótulos/histórico](../../src/domain/navigation.ts), [barra inferior](../../src/components/ui.tsx).
- [Home](../../src/features/LocalHome.tsx), [fases](../../src/domain/models.ts),
  [roteiro](../../src/features/itinerary/Itinerary.tsx), [Mais](../../src/features/More.tsx).
- [Reservas/gastos/compras/bagagem/documentos](../../src/features/operations/Operations.tsx),
  [editores ativos](../../src/components/LocalEditors.tsx),
  [formulários compartilhados](../../src/components/forms.tsx).
- [Viajantes/conta/amigos/configurações](../../src/features/LocalSettings.tsx),
  [viagens](../../src/features/Trips.tsx), [editor K01](../../src/features/TripEditor.tsx).
- [Álbum](../../src/features/Album.tsx), [mídia](../../src/data/media.ts),
  [SOS/busca](../../src/features/tools/Tools.tsx), [conversor](../../src/features/ConverterV11.tsx).
- [Integrações](../../src/adapters/external.ts), [serviços ativos](../../src/adapters/index.ts),
  [engine/contexto](../../src/data/TravelContext.tsx), [PWA](../../vite.config.ts),
  [instruções de execução](../../README.md).
