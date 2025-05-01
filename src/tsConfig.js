import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export async function updateTsConfig(targetDir) {
    console.log(chalk.blue('Step 4: Updating TypeScript configuration...'));

    const tsConfigPath = path.join(targetDir, 'tsconfig.json');

    // Check if project uses TypeScript
    if (!fs.existsSync(tsConfigPath)) {
        console.log(chalk.yellow('i No tsconfig.json found, skipping TypeScript configuration update'));
        return true;
    }

    try {
        const tsConfig = JSON.parse(await fs.readFile(tsConfigPath, 'utf8'));
        let updated = false;

        // Remove empty files array if it exists
        if (tsConfig.files && Array.isArray(tsConfig.files) && tsConfig.files.length === 0) {
            delete tsConfig.files;
            updated = true;
            console.log(chalk.green('√ Removed empty files array'));
        }

        // Initialize compilerOptions if not present
        if (!tsConfig.compilerOptions) {
            tsConfig.compilerOptions = {};
        }

        // Set required options for Next.js
        if (tsConfig.compilerOptions.jsx !== 'preserve') {
            tsConfig.compilerOptions.jsx = 'preserve';
            updated = true;
            console.log(chalk.green('√ Set jsx to "preserve"'));
        }

        if (tsConfig.compilerOptions.esModuleInterop !== true) {
            tsConfig.compilerOptions.esModuleInterop = true;
            updated = true;
            console.log(chalk.green('√ Set esModuleInterop to true'));
        }

        if (tsConfig.compilerOptions.allowJs !== true) {
            tsConfig.compilerOptions.allowJs = true;
            updated = true;
            console.log(chalk.green('√ Set allowJs to true'));
        }

        if (tsConfig.compilerOptions.forceConsistentCasingInFileNames !== true) {
            tsConfig.compilerOptions.forceConsistentCasingInFileNames = true;
            updated = true;
            console.log(chalk.green('√ Set forceConsistentCasingInFileNames to true'));
        }

        if (tsConfig.compilerOptions.incremental !== true) {
            tsConfig.compilerOptions.incremental = true;
            updated = true;
            console.log(chalk.green('√ Set incremental to true'));
        }

        // Add Next.js plugin
        if (!tsConfig.compilerOptions.plugins) {
            tsConfig.compilerOptions.plugins = [];
        }

        const hasNextPlugin = tsConfig.compilerOptions.plugins.some(
            plugin => plugin.name === 'next'
        );

        if (!hasNextPlugin) {
            tsConfig.compilerOptions.plugins.push({ name: 'next' });
            updated = true;
            console.log(chalk.green('√ Added Next.js plugin to plugins array'));
        }

        // Update include array
        if (!tsConfig.include) {
            tsConfig.include = [];
        }

        const includeEntries = ['./dist/types/**/*.ts', './next-env.d.ts'];
        let includeUpdated = false;

        for (const entry of includeEntries) {
            if (!tsConfig.include.includes(entry)) {
                tsConfig.include.push(entry);
                includeUpdated = true;
            }
        }

        if (includeUpdated) {
            updated = true;
            console.log(chalk.green('√ Updated include array with Next.js entries'));
        }

        // Update exclude array
        if (!tsConfig.exclude) {
            tsConfig.exclude = [];
        }

        if (!tsConfig.exclude.includes('./node_modules')) {
            tsConfig.exclude.push('./node_modules');
            updated = true;
            console.log(chalk.green('√ Added node_modules to exclude array'));
        }

        // Remove references to tsconfig.node.json
        if (tsConfig.references) {
            const nodeConfigRef = tsConfig.references.findIndex(
                ref => ref.path === './tsconfig.node.json'
            );

            if (nodeConfigRef !== -1) {
                tsConfig.references.splice(nodeConfigRef, 1);
                updated = true;
                console.log(chalk.green('√ Removed reference to tsconfig.node.json'));
            }

            const appConfigRef = tsConfig.references.findIndex(
                ref => ref.path === './tsconfig.app.json'
            );

            if (appConfigRef !== -1) {
                tsConfig.references.splice(appConfigRef, 1);
                updated = true;
                console.log(chalk.green('√ Removed reference to tsconfig.app.json'));
            }

            // Remove references array if empty
            if (tsConfig.references.length === 0) {
                delete tsConfig.references;
                updated = true;
                console.log(chalk.green('√ Removed empty references array'));
            }
        }

        // Save changes if needed
        if (updated) {
            await fs.writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2));
            console.log(chalk.green('√ Updated tsconfig.json'));
        } else {
            console.log(chalk.yellow('i No changes needed for tsconfig.json'));
        }

        // Create next-env.d.ts if it doesn't exist
        const nextEnvPath = path.join(targetDir, 'next-env.d.ts');
        if (!fs.existsSync(nextEnvPath)) {
            await fs.writeFile(
                nextEnvPath,
                `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// NOTE: This file should not be edited\n// see https://nextjs.org/docs/basic-features/typescript for more information.\n`
            );
            console.log(chalk.green('√ Created next-env.d.ts'));
        }

        console.log(chalk.green('✓ Step 3 completed'));
        return true;
    } catch (error) {
        console.error(chalk.red(`Error updating tsconfig.json: ${error.message}`));
        throw error;
    }
} 