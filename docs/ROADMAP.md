# Roadmap — Travel OS / Foravento

Atualizado em 20/10/2026. Estrutura técnica aprovada pelo usuário; prioridades de
estabilização baseadas na auditoria. Direções de produto confirmadas em
[DECISIONS](DECISIONS.md), D009–D022. Não autoriza implementação automática.
K01 concluído, validado e aprovado pelo usuário em 06/10/2026. Primeiro bloco da
identidade V1.2 preservado no checkpoint `8c71dda`; rodada visual integral D022
em execução no working tree. IDs K01–K08 referem-se a
[PROJECT_STATE](PROJECT_STATE.md), que registra o estado funcional V1.1.

## 1. Estabilização dos problemas auditados

| Ordem | Escopo                                                | Critério de conclusão                                                                                                     | Estado                                                                                                                |
| ----- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1     | K01: preservar identidades/metadados ao editar viagem | Renomear/reordenar preserva IDs, preferências, transportes e vínculos; testes com dados anteriores                        | Concluído; validado e aprovado em 06/10/2026                                                                          |
| 2     | K04: recuperar abertura do IndexedDB                  | Falha transitória seguida de nova tentativa, chamadas concorrentes compartilham conexão e dados não são limpos            | Implementado e testado no checkpoint `b4c8568`; validação adicional de produto pendente                               |
| 3     | K02: completar consistência das reservas              | Campos de período/horário/código/status editáveis e preservados; transmitir lugar/coordenadas; validar vínculo e estadias | Parcialmente implementado/testado; estadia ainda não é representada em cada dia do roteiro                            |
| 4     | K07: concluir integração Places no host manual        | Chave server-only, origem exata, função Node e pesquisa real validadas após configuração do dono do deploy                | Migração Geoapify, testes e busca real local concluídos; aguarda configuração e validação manual no host pelo usuário |
| 5     | K03: conciliar duração da viagem/roteiro              | Mesmo período aceito e navegável; escolher explicitamente limite versus ampliação, preservando viagens existentes         | Não iniciado; solução de produto a decidir                                                                            |
| 6     | K05: atualizar retrospectiva                          | Contagem reflete importação/edição/arquivamento; decidir o que significa favorito no Álbum                                | Atualização de fotos implementada; favoritos ainda pendentes de decisão                                               |
| 7     | K06: avaliar ciclo de vida dos blobs                  | Identificar referências/cópias e cancelamentos; propor política de retenção sem apagar mídia existente                    | Não iniciado; revisão isolada necessária                                                                              |

Testar comportamento afetado, preservação de dados e build em cada correção;
atualizar estado e decisões. Não marcar conclusão apenas por alteração de código.

## 2. Cobertura e manutenção (K08)

- [ ] Adicionar regressões dos bugs corrigidos e migração real V1 preenchida → V2.
- [ ] Incluir checagem do endpoint no processo normal de validação.
- [ ] Cobrir fluxos críticos de interface com dados sintéticos.
- [ ] Validar instalação, atualização, teclado, safe areas e compartilhamento em
      dispositivos físicos; registrar resultados e limitações.
- [ ] Inventariar código/dependências legados e propor redução de duplicações
      após estabilização. Não apagar módulos históricos sem revisar compatibilidade.

## 3. Proteção dos dados já existentes

Backup/importação .travelos já estão documentados como ausentes. Prioridade
recomendada pela auditoria: definir contrato e restauração verificável após a
estabilização. Escopo e implementação ainda não aprovados; não iniciar aqui.
Não inventar formato definitivo, sincronização ou serviços remotos.

## 4. V1.2 — transformação visual Foravento

Marco confirmado: a nova identidade visual começa na V1.2 (D009–D012 e D019).
A base funcional continua V1.1. D022 substituiu a aprovação por tela por uma
rodada integral; estado abaixo distingue implementação de validação pendente.

| Trabalho previsto                                            | Critério de conclusão                                                                                                                                 | Estado                                                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Iniciar a substituição da identidade Travel OS por Foravento | Entrada, cabeçalho, título/manifesto e navegação global; conferir versão final do símbolo e atualizar depois ícones/splash e demais pontos aplicáveis | Shell inicial implementado; em revisão                                                      |
| Aplicar Rodada 04 em Minhas Viagens                          | Cards horizontais com capa real/fundo escuro, estados por fase, criação/edição, tokens e preview responsiva, sem mudar persistência                   | Implementado e validado localmente; revisão conjunta D022                                   |
| Redesenhar Início, Roteiro, Álbum e Mais                     | Composição fotográfica/contextual, timeline única, Por data/Imersivo e oito módulos, sem dados fictícios                                              | Implementação visual no working tree; validação cruzada em andamento                        |
| Aplicar sistema a módulos, formulários e detalhes            | Reservas, gastos, compras, bagagem, documentos, conversor, viajantes, SOS, modais e estados vazios consistentes                                       | Tratamento compartilhado e específico no working tree; verificação visual completa pendente |
| Validar visualmente e em dispositivo                         | Capturas reais 375/402/440, fluxos com dados representativos, teclado/gestos/safe areas no iPhone, PWA/ícones                                         | Capturas parciais em navegador; aparelho físico e ícones instaláveis pendentes              |
| Preservar arquitetura funcional                              | Identidade aplicada sobre a base atual, sem reescrita motivada pela marca; dados e fluxos preservados                                                 | Restrição confirmada                                                                        |
| Manter somente modo escuro                                   | Identidade coerente com o modo escuro; nenhuma introdução de modo claro/automático                                                                    | Restrição confirmada por enquanto                                                           |

Referências recebidas em 20/10/2026: PRD V1, mockups V1, símbolo e HTMLs das
Rodadas 01–04. A Rodada 04 é referência visual principal, com Direção B aprovada.
Conferir a versão vetorial master antes de substituir ícones instaláveis. Preservar a
arquitetura e não ativar Agente/Explorar dos mockups antigos.

## 5. Requisitos de produto — versão de entrega ainda não definida

Decisões confirmadas, com comparação entre estado atual e trabalho restante.
Nenhuma linha representa implementação feita nesta etapa.

| Área / decisão        | Estado atual V1.1                                                                                     | Trabalho a preservar, validar ou realizar                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Viajantes — D013/D014 | Membros vêm da viagem selecionada; nome aparece no cabeçalho global                                   | Validar troca no dropdown da Home sem misturar viagens e contexto suficiente pelo nome, sem repetir todos os dados                                             |
| SOS — D015            | Seguro, hospedagem, documentos e contatos presentes; sem atalho dedicado 911                          | Preservar conteúdo/ausência do atalho; corrigir hospedagem conforme K02                                                                                        |
| Conversor — D016      | Moeda, distância/comprimento, peso, calçados masculinos/femininos e roupas Nike masculina             | Preservar cobertura existente e completar referências de roupas femininas; conferir identificação das fontes e adequação masculina/feminina                    |
| Viajantes — D017/D021 | Viajantes local ativo; Tradutor sem tela ativa/tradução livre                                         | Manter Viajantes no produto; Tradutor foi removido do escopo V1.2 por D021, sem apagar código legado nesta etapa                                               |
| Álbum — D018          | Por data/Destaques, visualizador ampliado, anterior/próxima, gesto horizontal e compartilhar/download | Preservar galeria cronológica e ações; avaliar/adequar segunda navegação principal imersiva com percurso horizontal; verificar interação em dispositivo físico |

## 6. Decisões de produto adicionais — reservado

Aguardando novas orientações. Continuam sem solução aprovada: limite de duração,
favoritos da retrospectiva, retenção de mídia, detalhes visuais, escopo operacional
e versões de entrega dos requisitos da seção 5. Não preencher lacunas
com preferências presumidas.

## Concluído

- 06/10/2026: auditoria sem alterações funcionais; 46 testes existentes aprovados.
- 06/10/2026: Git inicializado e baseline `7f1cc01` criado com aprovação do usuário.

- 06/10/2026: estrutura técnica de continuidade aprovada pelo usuário.

- 06/10/2026: documentação de continuidade/AI Router e decisões de produto
  aprovadas e versionadas em `141f141`.
- 06/10/2026: K01 implementado e validado: 19 regressões novas, 65 testes aprovados,
  build e checagem do endpoint aprovados; editor verificado em 375/402/440 px.
  Correção aprovada pelo usuário para versionamento; nenhuma outra tarefa iniciada.

K04 e a migração Geoapify foram preservados no checkpoint `b4c8568`. A etapa
externa de K07 continua pendente de configuração e teste no host manual do usuário.
Em 20/10/2026 começou somente o primeiro bloco visual da V1.2.

Ao concluir/priorizar tarefas, atualizar esta lista, o estado e os critérios
pendentes; decisão confirmada não significa funcionalidade implementada.
