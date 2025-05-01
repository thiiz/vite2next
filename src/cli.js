#!/usr/bin/env node

import chalk from 'chalk';
import { program } from 'commander';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
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

function displayBanner() {
    console.log(chalk.blue.bold('vite2next - Vite to Next.js Migration Tool'));
    console.log(chalk.gray('Following the official Next.js migration guide\n'));
}

function displayMigrationSteps() {
    console.log(chalk.blue('The following steps will be performed:'));
    console.log(chalk.gray('1. Clean up Vite files'));
    console.log(chalk.gray('2. Install Next.js dependencies'));
    console.log(chalk.gray('3. Create Next.js configuration file'));
    console.log(chalk.gray('4. Update TypeScript configuration (if applicable)'));
    console.log(chalk.gray('5. Create root layout file'));
    console.log(chalk.gray('6. Create entrypoint page'));
    console.log(chalk.gray('7. Update static image imports'));
    console.log(chalk.gray('8. Migrate environment variables'));
    console.log(chalk.gray('9. Update package.json scripts'));
    console.log(chalk.gray('10. Setup React Router compatibility (if applicable)'));
    console.log(chalk.gray('11. Migrate static assets\n'));
}

function displayNextSteps() {
    console.log(chalk.blue('\nNext steps:'));
    console.log(chalk.gray('- Run "npm run dev" to start your Next.js application'));
    console.log(chalk.gray('- Check the created docs/ directory for migration guides'));
    console.log(chalk.gray('- Consider migrating from React Router to Next.js App Router'));
    console.log(chalk.gray('- Optimize images with the Next.js <Image> component'));
    console.log(chalk.gray('- Optimize fonts with next/font'));
    console.log(chalk.gray('- Optimize third-party scripts with the <Script> component'));
    console.log(chalk.gray('- Review your routes and implement App Router features gradually'));
}

async function validateProjectDirectory(targetDir) {
    if (!fs.existsSync(targetDir)) {
        console.error(chalk.red(`Error: Directory ${targetDir} does not exist`));
        process.exit(1);
    }

    const packageJsonPath = path.join(targetDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        console.error(chalk.red(`Error: No package.json found in ${targetDir}`));
        process.exit(1);
    }

    return packageJsonPath;
}

async function confirmViteProject(packageJsonPath, skipConfirmation) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const hasVite = packageJson.dependencies?.vite ||
        packageJson.devDependencies?.vite ||
        fs.existsSync(path.join(path.dirname(packageJsonPath), 'vite.config.js')) ||
        fs.existsSync(path.join(path.dirname(packageJsonPath), 'vite.config.ts'));

    if (!hasVite && !skipConfirmation) {
        const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'This does not appear to be a Vite project. Continue anyway?',
            default: false
        }]);

        if (!confirm) {
            console.log(chalk.yellow('Migration cancelled'));
            process.exit(0);
        }
    }
}

async function confirmMigration(skipConfirmation) {
    if (!skipConfirmation) {
        const { proceed } = await inquirer.prompt([{
            type: 'confirm',
            name: 'proceed',
            message: 'Do you want to proceed with the migration?',
            default: true
        }]);

        if (!proceed) {
            console.log(chalk.yellow('Migration cancelled'));
            process.exit(0);
        }
    }
}

async function runMigration(targetDir, options) {
    try {
        console.log(chalk.blue('\nStarting migration...\n'));

        await handleCleanup(targetDir, options.yes);
        await migrateDependencies(targetDir, options.skipInstall);
        await createNextConfig(targetDir);
        await updateTsConfig(targetDir);
        await createRootLayout(targetDir);
        await createEntrypoint(targetDir);
        await updateImageImports(targetDir);
        await migrateEnvVars(targetDir);
        await updatePackageJson(targetDir);
        await migrateReactRouter(targetDir);
        await migrateStaticAssets(targetDir);

        console.log(chalk.green.bold('\n✅ Migration completed successfully!'));
        displayNextSteps();
    } catch (error) {
        console.error(chalk.red(`\nError during migration: ${error.message}`));
        console.error(error);
        process.exit(1);
    }
}

async function handleCleanup(targetDir, skipConfirmation) {
    if (!skipConfirmation) {
        const { cleanup } = await inquirer.prompt([{
            type: 'confirm',
            name: 'cleanup',
            message: 'Do you want to remove Vite-related files?',
            default: true
        }]);

        if (cleanup) {
            await cleanupViteFiles(targetDir);
        }
    } else {
        await cleanupViteFiles(targetDir);
    }
}

async function main() {
    displayBanner();

    program
        .name('vite2next')
        .description('CLI to migrate Vite projects to Next.js')
        .version('1.0.0')
        .argument('[project-directory]', 'Directory of the Vite project to migrate', '.')
        .option('-y, --yes', 'Skip confirmation prompts', false)
        .option('--skip-install', 'Skip installing dependencies', false)
        .action(async (projectDir, options) => {
            const targetDir = path.resolve(process.cwd(), projectDir);
            const packageJsonPath = await validateProjectDirectory(targetDir);

            await confirmViteProject(packageJsonPath, options.yes);
            displayMigrationSteps();
            await confirmMigration(options.yes);
            await runMigration(targetDir, options);
        });

    program.parse(process.argv);
}

main().catch(error => {
    console.error(chalk.red(`Unexpected error: ${error.message}`));
    console.error(error);
    process.exit(1);
}); 