#!/usr/bin/env node

import { cleanupViteFiles } from './cleanup.js';
import { migrateDependencies } from './dependencies.js';
import { createEntrypoint } from './entrypoint.js';
import { migrateEnvVars } from './envVars.js';
import { updateImageImports } from './images.js';
import { createNextConfig } from './nextConfig.js';
import { updatePackageJson } from './packageJson.js';
import { createRootLayout } from './rootLayout.js';
import { migrateReactRouter } from './routerMigration.js';
import { migrateStaticAssets } from './staticAssets.js';
import { updateTsConfig } from './tsConfig.js';

/**
 * Módulo API que permite usar as funções de migração individualmente
 * ou como uma sequência completa em seus próprios scripts
 */

export {
    cleanupViteFiles,
    createEntrypoint,
    createNextConfig,
    createRootLayout,
    migrateDependencies,
    migrateEnvVars,
    migrateReactRouter,
    migrateStaticAssets,
    updateImageImports,
    updatePackageJson,
    updateTsConfig
};

/**
 * Função que executa todas as etapas da migração em sequência
 * @param {string} targetDir - Diretório do projeto a ser migrado
 * @param {Object} options - Opções de configuração
 * @param {boolean} options.skipInstall - Pular instalação de dependências
 * @param {boolean} options.skipCleanup - Pular limpeza de arquivos Vite
 * @returns {Promise<boolean>} - Retorna true se a migração for concluída com sucesso
 */
export async function migrateToNext(targetDir, options = {}) {
    try {
        // Etapa 1: Instalar dependências do Next.js
        await migrateDependencies(targetDir, options.skipInstall);

        // Etapa 2: Criar arquivo de configuração do Next.js
        await createNextConfig(targetDir);

        // Etapa 3: Atualizar configuração do TypeScript
        await updateTsConfig(targetDir);

        // Etapa 4: Criar arquivo de layout raiz
        await createRootLayout(targetDir);

        // Etapa 5: Criar página de entrada
        await createEntrypoint(targetDir);

        // Etapa 6: Atualizar importações de imagens estáticas
        await updateImageImports(targetDir);

        // Etapa 7: Migrar variáveis de ambiente
        await migrateEnvVars(targetDir);

        // Etapa 8: Atualizar scripts do package.json
        await updatePackageJson(targetDir);

        // Etapa 9: Limpar arquivos do Vite
        if (!options.skipCleanup) {
            await cleanupViteFiles(targetDir);
        }

        // Etapa 10: Configurar compatibilidade com React Router (se aplicável)
        await migrateReactRouter(targetDir);

        // Etapa 11: Migrar assets estáticos
        await migrateStaticAssets(targetDir);

        return true;
    } catch (error) {
        console.error(`Erro durante a migração: ${error.message}`);
        throw error;
    }
} 