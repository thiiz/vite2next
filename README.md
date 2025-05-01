# vite-to-next

Uma ferramenta de linha de comando que migra automaticamente projetos Vite para Next.js seguindo o [guia oficial de migração do Next.js](https://nextjs.org/docs/app/building-your-application/upgrading/from-vite).

## Funcionalidades

- Instala dependências do Next.js
- Cria arquivo de configuração do Next.js
- Atualiza configuração do TypeScript
- Cria layout raiz baseado no seu index.html existente
- Configura página de entrada para manter o padrão SPA (Single Page Application)
- Ajuda com importações de imagens estáticas
- Migra variáveis de ambiente do formato Vite para Next.js
- Atualiza scripts no package.json
- Remove arquivos relacionados ao Vite
- Configura compatibilidade com React Router
- Migra assets estáticos

## Instalação

### Instalação Global

```bash
npm install -g vite-to-next
```

### Uso Local (sem instalação)

```bash
npx vite-to-next
```

## Uso

Navegue até o diretório do seu projeto Vite e execute:

```bash
vite-to-next
```

A ferramenta irá guiá-lo através do processo de migração com prompts interativos.

### Opções

- `-y, --yes`: Pula todas as confirmações.
- `--skip-install`: Pula a instalação de dependências.
- `[project-directory]`: Especifica um diretório alvo (o padrão é o diretório atual).

Exemplos:

```bash
# Migrar o diretório atual
vite-to-next

# Migrar um diretório específico
vite-to-next ./meu-projeto-vite

# Pular todas as confirmações
vite-to-next -y

# Pular instalação de dependências
vite-to-next --skip-install
```

## Etapas da Migração

A ferramenta segue o guia oficial de migração do Next.js e realiza estas etapas:

1. **Instalar Dependência do Next.js**: Adiciona Next.js às dependências do projeto.
2. **Criar Configuração do Next.js**: Cria um arquivo `next.config.mjs` com base nas configurações do Vite.
3. **Atualizar Configuração TypeScript**: Ajusta seu `tsconfig.json` se você estiver usando TypeScript.
4. **Criar Layout Raiz**: Cria um componente de layout raiz baseado no seu `index.html`.
5. **Criar Página de Entrada**: Configura páginas adequadas usando o App Router.
6. **Atualizar Importações de Imagens Estáticas**: Adiciona suporte e helpers para importação de imagens.
7. **Migrar Variáveis de Ambiente**: Atualiza suas variáveis de ambiente de `VITE_` para `NEXT_PUBLIC_`.
8. **Atualizar Scripts no package.json**: Atualiza scripts para usar comandos Next.js.
9. **Limpeza**: Remove arquivos e dependências relacionados ao Vite.
10. **Configurar Compatibilidade com React Router**: Facilita a migração do React Router para o Next.js App Router.
11. **Migrar Assets Estáticos**: Ajuda a configurar corretamente os assets estáticos no Next.js.

## Após a Migração

Após a conclusão da migração, sua aplicação estará rodando no Next.js como um Single Page Application. A partir daí, você pode adotar incrementalmente mais recursos do Next.js:

- Migrar do React Router para o App Router do Next.js
- Otimizar imagens com o componente `<Image>`
- Otimizar fontes com `next/font`
- Otimizar scripts com o componente `<Script>`
- Adicionar Server Components e busca de dados do lado do servidor
- Adicionar rotas de API
- E muito mais!

Para instruções detalhadas sobre como adaptar seu código depois da migração, consulte os arquivos de documentação criados na pasta `docs/` do seu projeto.

## Como Usar em Seus Próprios Projetos

Para usar esta ferramenta em seus projetos, você tem algumas opções:

1. **Como dependência global**: Instale-a com `npm install -g vite-to-next` e use em qualquer projeto
   
2. **Como dependência de desenvolvimento**: Adicione ao seu projeto com `npm install --save-dev vite-to-next`

3. **Executar diretamente**: Use `npx vite-to-next` em qualquer projeto sem instalação prévia

4. **Integrar ao seu próprio CLI**: Importe os módulos específicos que você precisa:

```javascript
import { updatePackageJson } from 'vite-to-next/api';
import { migrateDependencies } from 'vite-to-next/api';

// Use em seu próprio script
await updatePackageJson('./meu-projeto');
await migrateDependencies('./meu-projeto', false);
```

## Licença

MIT 