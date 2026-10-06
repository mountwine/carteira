# Guia para agentes — Travel OS

## Contexto

Travel OS V1.1 é um aplicativo pessoal de viagens com interface em português
brasileiro, pensado para uso mobile e offline. Usa React 19, TypeScript estrito,
Vite e PWA. Leia `README.md` antes de alterar arquitetura ou integrações;
`docs/QA.md` registra a validação anterior e seus limites, não o resultado atual.

A aplicação ativa usa autenticação e armazenamento locais. Não há backend de
contas, sincronização remota, colaboração real ou integração ativa com agentes.
Arquivos Supabase e módulos de demonstração legados não representam o fluxo ativo.

## Comandos

Requisitos declarados: Node >=22.12.0 e pnpm 11.19.0. Use pnpm e preserve
`pnpm-lock.yaml`.

- Instalar dependências: `pnpm install --frozen-lockfile`.
- Desenvolvimento: `pnpm dev`.
- Testes: `pnpm test` (Vitest, incluindo testes em `tests/` e junto ao código).
- Teste específico: `pnpm exec vitest run tests/v11.test.ts`.
- Verificar TypeScript e gerar produção: `pnpm build`.
- Preview de produção: `pnpm preview --port 5173`.
- Formatação disponível: `pnpm format`; esse comando reescreve todo `src` e
  `vite.config.ts`. Para alterações pequenas, formate apenas os arquivos editados
  com `pnpm exec prettier --write <arquivos>`.

Não existe script de lint. O `tsconfig.json` inclui `src` e `vite.config.ts`;
o build não verifica diretamente `api/places.ts`.

## Estrutura

- `src/app/`: composição da aplicação, sessão, navegação e workspace.
- `src/features/`: telas e fluxos de viagens, roteiro, álbum e ferramentas.
- `src/components/`: controles e formulários compartilhados; `LocalEditors.tsx`
  contém editores e validações locais.
- `src/domain/`: modelos, regras, mutações, conversões e navegação.
- `src/data/`: IndexedDB, repositório, engine, contexto, mídia e arquivos.
- `src/adapters/`: autenticação/viagens locais, preferências e serviços externos.
  `index.ts` seleciona os serviços ativos.
- `src/styles/`: tokens e estilos. Preserve o tema escuro, fonte Manrope local e
  os tokens centralizados de `tokens.css`.
- `api/places.ts`: função Vercel para Google Places; não armazena viagens.
- `public/`: assets locais e ícones. Consulte `ASSETS.md` ao trabalhar com mídia.
- `supabase/`: migrations e verificações históricas; não ativar implicitamente.
- `tests/`: testes de domínio, banco, offline, mídia e endpoint; alguns usam
  `fake-indexeddb` e PGlite.
- `dist/` e `*.tsbuildinfo`: saídas geradas; altere as fontes.

## Regras de implementação

Siga os padrões existentes: componentes funcionais, hooks, imports ES modules e
tipos explícitos nas fronteiras. Mantenha regras de negócio no domínio e acesso
ao armazenamento/serviços nas camadas próprias. Reutilize formulários e tokens.

Preserve identificadores, dados anteriores e isolamento por proprietário/viagem.
Migrações devem ser compatíveis e idempotentes. Não limpe localStorage ou IndexedDB
para resolver falhas. Exclusões existentes usam arquivamento. Compra e gasto
vinculado devem manter a transação única e não gerar duplicatas. Preserve controle
de versão e revisão de conflitos entre janelas.

Não introduza seeds automáticos, cotações fictícias, horários ou fusos inventados.
Indique indisponibilidade quando uma integração não responder e mantenha os
fallbacks manuais/cache identificados. Não apresente convites ou recursos futuros
como funcionais sem implementá-los.

`GOOGLE_PLACES_API_KEY` e `ALLOWED_ORIGIN` são variáveis de servidor.
Nunca exponha segredos com prefixo `VITE_` ou no frontend. `VITE_PLACES_ENDPOINT`
é configuração pública opcional. Vite dev/preview não executa funções Vercel.

## Validação

Após alterações de comportamento, execute testes relevantes e `pnpm build`.
Para mudanças em persistência, valide migração, isolamento, reabertura offline e
concorrência. Para UI, confira os fluxos afetados e larguras mobile de 375, 402 e
440 px, incluindo navegação de retorno e ausência de overflow horizontal.

Ao usar o navegador, preserve protocolo, host e porta: a origem define o espaço
de armazenamento. Use uma viagem de teste para QA e preserve registros pessoais.
Pare o dev antes de abrir preview na mesma porta. O preview inclui service worker;
confira atualização e cache quando houver comportamento aparentemente antigo.
Não afirme certificação em iPhone/Android físico com base em viewport desktop.

Atualize `README.md` quando mudar comportamento, configuração ou limitações.
Relate os comandos realmente executados e quaisquer verificações pendentes.
