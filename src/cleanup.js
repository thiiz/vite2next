import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';

export async function cleanupViteFiles(targetDir) {
    logger.startStep('Cleaning up Vite files');

    const filesToRemove = [
        'main.tsx',
        'main.jsx',
        'main.js',
        'index.html',
        'vite-env.d.ts',
        './src/vite-env.d.ts',
        './src/vite-env.d.ts',
        'tsconfig.node.json',
        'tsconfig.app.json',
        'vite.config.js',
        'vite.config.ts',
        'vite.app.config.ts',
        'vite.app.config.js',
        'vite.app.config.tsx',
        'vite.app.config.jsx',
        'main.tsx',
        './src/main.tsx',
        'App.css',
        './src/App.css',
        './src/app/App.css',
        './src/styles/App.css'
    ];

    // Additionally remove any root-level app directory that might have been created incorrectly
    const rootAppDir = path.join(targetDir, 'app');
    if (fs.existsSync(rootAppDir)) {
        // Check if all files/folders from the root app directory should be moved to src/app
        const srcAppDir = path.join(targetDir, 'src', 'app');
        await fs.ensureDir(srcAppDir);

        logger.warning('Found an app directory at root level');
        logger.info('Moving any content from root app directory to src/app...');

        // Copy all content from root app to src/app
        try {
            await fs.copy(rootAppDir, srcAppDir, { overwrite: false });
            logger.success('Moved content from root app directory to src/app');

            // Remove the root app directory
            await fs.remove(rootAppDir);
            logger.success('Removed duplicate app directory at root level');
        } catch (error) {
            logger.error(`Error handling app directory: ${error.message}`);
        }
    }

    let removedCount = 0;
    let total = filesToRemove.length;

    logger.startSpinner('Scanning for Vite files');

    for (const file of filesToRemove) {
        const filePath = path.join(targetDir, file);
        if (fs.existsSync(filePath)) {
            await fs.remove(filePath);
            logger.success(`Removed ${file}`);
            removedCount++;
        }
    }

    logger.stopSpinner(true, 'File scan completed');

    if (removedCount === 0) {
        logger.warning('No Vite files found to remove');
    } else {
        logger.info(`Removed ${removedCount} Vite files`);
    }

    // Remove Vite from dependencies
    const packageJsonPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        logger.startSpinner('Checking package.json for Vite dependencies');

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
        let removeCount = 0;

        if (packageJson.dependencies) {
            for (const dep in packageJson.dependencies) {
                if (vitePluginPattern.test(dep)) {
                    delete packageJson.dependencies[dep];
                    removeCount++;
                    updated = true;
                }
            }
        }

        if (packageJson.devDependencies) {
            for (const dep in packageJson.devDependencies) {
                if (vitePluginPattern.test(dep)) {
                    delete packageJson.devDependencies[dep];
                    removeCount++;
                    updated = true;
                }
            }
        }

        logger.stopSpinner(true, 'Dependency check completed');

        if (updated) {
            logger.startSpinner('Updating package.json');
            await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
            logger.stopSpinner(true, 'package.json updated');
            logger.success(`Removed ${removeCount} Vite-related dependencies`);
        } else {
            logger.info('No Vite dependencies found in package.json');
        }
    }

    logger.stepComplete();
    return true;
} 