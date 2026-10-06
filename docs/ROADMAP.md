# Roadmap — Travel OS / Foravento

Atualizado em 06/10/2026. Estrutura técnica aprovada pelo usuário; prioridades de
estabilização baseadas na auditoria. Direções de produto confirmadas em
[DECISIONS](DECISIONS.md), D009–D018. Não autoriza implementação automática.
Nenhuma correção ou mudança de identidade concluída. IDs K01–K08 referem-se a
[PROJECT_STATE](PROJECT_STATE.md), que registra o estado funcional V1.1.

## 1. Estabilização dos problemas auditados

| Ordem | Escopo | Critério de conclusão | Estado |
|---|---|---|---|
| 1 | K01: preservar identidades/metadados ao editar viagem | Renomear/reordenar preserva IDs, preferências, transportes e vínculos; testes com dados anteriores | Proposto |
| 2 | K04: recuperar abertura do IndexedDB | Falha/blocked seguida de nova tentativa bem-sucedida, sem limpar dados; teste isolado | Proposto |
| 3 | K02: completar consistência das reservas | Confirmar escopo dos campos já modelados, preservar períodos e transmitir local/coordenadas; testar hospedagem em múltiplos dias e roteiro | Proposto |
| 4 | K03: conciliar duração da viagem/roteiro | Mesmo período aceito e navegável; escolher explicitamente limite versus ampliação, preservando viagens existentes | Proposto; solução a decidir |
| 5 | K05: atualizar retrospectiva | Contagem reflete importação/edição/arquivamento sem recarregar; comportamento de favoritos depende de decisão de produto | Proposto; favoritos a decidir |
| 6 | K06: avaliar ciclo de vida dos blobs | Identificar referências/cópias e cancelamentos; propor política de retenção sem apagar mídia existente | Proposto; limpeza depende de autorização |
| 7 | K07: revisar proteção de Places | Testar contrato de origem/limites e definir controles adequados ao deployment antes de ativar provider em produção | Proposto |

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

## 4. V1.2 — início da identidade Foravento

Marco confirmado: a nova identidade visual começará a ser aplicada na V1.2
(D009–D012). A versão atual continua Travel OS V1.1. Não há data de entrega,
design final nem compromisso de concluir toda a identidade nessa versão.

| Trabalho previsto | Critério de conclusão | Estado |
|---|---|---|
| Iniciar a substituição da identidade Travel OS por Foravento | Nome e elementos visuais aprovados aplicados ao escopo definido da V1.2; alterações rastreáveis e verificadas | Confirmado como direção; não iniciado |
| Preservar arquitetura funcional | Identidade aplicada sobre a base atual, sem reescrita motivada pela marca; dados e fluxos preservados | Restrição confirmada |
| Manter somente modo escuro | Identidade coerente com o modo escuro; nenhuma introdução de modo claro/automático | Restrição confirmada por enquanto |

Definir o recorte visual antes da implementação. Não inventar logo, paleta ou
estilo final. Estabilização continua primeiro; não vincular automaticamente todas
as funcionalidades abaixo à V1.2 nem usar identidade como pretexto para refatoração.

## 5. Requisitos de produto — versão de entrega ainda não definida

Decisões confirmadas, com comparação entre estado atual e trabalho restante.
Nenhuma linha representa implementação feita nesta etapa.

| Área / decisão | Estado atual V1.1 | Trabalho a preservar, validar ou realizar |
|---|---|---|
| Viajantes — D013/D014 | Membros vêm da viagem selecionada; nome aparece no cabeçalho global | Validar troca no dropdown da Home sem misturar viagens e contexto suficiente pelo nome, sem repetir todos os dados |
| SOS — D015 | Seguro, hospedagem, documentos e contatos presentes; sem atalho dedicado 911 | Preservar conteúdo/ausência do atalho; corrigir hospedagem conforme K02 |
| Conversor — D016 | Moeda, distância/comprimento, peso, calçados masculinos/femininos e roupas Nike masculina | Preservar cobertura existente e completar referências de roupas femininas; conferir identificação das fontes e adequação masculina/feminina |
| Tradutor e Viajantes — D017 | Viajantes local ativo; Tradutor sem tela ativa/tradução livre | Manter ambos no produto; definir escopo/provider/interface do Tradutor antes de implementar, sem tratar legado como funcionalidade pronta |
| Álbum — D018 | Por data/Destaques, visualizador ampliado, anterior/próxima, gesto horizontal e compartilhar/download | Preservar galeria cronológica e ações; avaliar/adequar segunda navegação principal imersiva com percurso horizontal; verificar interação em dispositivo físico |

## 6. Decisões de produto adicionais — reservado

Aguardando novas orientações. Continuam sem solução aprovada: limite de duração,
favoritos da retrospectiva, retenção de mídia, detalhes visuais, escopo operacional
do Tradutor e versões de entrega dos requisitos da seção 5. Não preencher lacunas
com preferências presumidas.

## Concluído

- 06/10/2026: auditoria sem alterações funcionais; 46 testes existentes aprovados.
- 06/10/2026: Git inicializado e baseline `7f1cc01` criado com aprovação do usuário.

- 06/10/2026: estrutura técnica de continuidade aprovada pelo usuário.

Camada de decisões de produto preparada em 06/10/2026, aguardando revisão; sem
novo commit. Ao concluir/priorizar tarefas, atualizar esta lista, o estado e os
critérios pendentes; decisão confirmada não significa funcionalidade implementada.
