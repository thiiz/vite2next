import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export async function cleanupViteFiles(targetDir) {
    console.log(chalk.blue('Step 1: Cleaning up Vite files...'));

    const filesToRemove = [
        'main.tsx',
        'main.jsx',
        'main.js',
        'index.html',
        'vite-env.d.ts',
        './src/vite-env.d.ts',
        'tsconfig.node.json',
        'tsconfig.app.json',
        'vite.config.ts',
        'vite.config.js',
        'vite.app.config.ts',
        'vite.app.config.js',
        'vite.app.config.tsx',
        'vite.app.config.jsx',
    ];

    let removedCount = 0;

    for (const file of filesToRemove) {
        const filePath = path.join(targetDir, file);
        if (fs.existsSync(filePath)) {
            await fs.remove(filePath);
            console.log(chalk.green(`√ Removed ${file}`));
            removedCount++;
        }
    }

    if (removedCount === 0) {
        console.log(chalk.yellow('i No Vite files found to remove'));
    }

    // Remove Vite from dependencies
    const packageJsonPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        let updated = false;

        // Remove from dependencies
        if (packageJson.dependencies && packageJson.dependencies.vite) {
            delete packageJson.dependencies.vite;
            updated = true;
        }

        // Remove from devDependencies
        if (packageJson.devDependencies && packageJson.devDependencies.vite) {
            delete packageJson.devDependencies.vite;
            updated = true;
        }

        // Remove related Vite plugins
        const vitePluginPattern = /(vite|@vitejs)/;

        if (packageJson.dependencies) {
            for (const dep in packageJson.dependencies) {
                if (vitePluginPattern.test(dep)) {
                    delete packageJson.dependencies[dep];
                    console.log(chalk.green(`√ Removed ${dep} from dependencies`));
                    updated = true;
                }
            }
        }

        if (packageJson.devDependencies) {
            for (const dep in packageJson.devDependencies) {
                if (vitePluginPattern.test(dep)) {
                    delete packageJson.devDependencies[dep];
                    console.log(chalk.green(`√ Removed ${dep} from devDependencies`));
                    updated = true;
                }
            }
        }

        if (updated) {
            await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log(chalk.green('√ Updated package.json to remove Vite dependencies'));
        }
    }

    console.log(chalk.green('✓ Step 9 completed'));
    return true;
} 