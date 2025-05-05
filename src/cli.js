#!/usr/bin/env node
import { program } from 'commander';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import { cleanupViteFiles } from './cleanup.js';
import { migrateDependencies } from './dependencies.js';
import { createEntrypoint } from './entrypoint.js';
import { migrateEnvVars } from './envVars.js';
import { updateImageImports } from './images.js';
import { displayBanner, displayCompletionMessage, displayMigrationSteps, displayNextSteps, logger } from './logger.js';
import { createNextConfig } from './nextConfig.js';
import { updatePackageJson } from './packageJson.js';
import { createRootLayout } from './rootLayout.js';
import { migrateReactRouter } from './routerMigration.js';
import { migrateStaticAssets } from './staticAssets.js';
import { updateTsConfig } from './tsConfig.js';

async function validateProjectDirectory(targetDir) {
    if (!fs.existsSync(targetDir)) {
        logger.error(`Directory ${targetDir} does not exist`);
        process.exit(1);
    }

    const packageJsonPath = path.join(targetDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        logger.error(`No package.json found in ${targetDir}`);
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
            logger.warning('Migration cancelled');
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
            logger.warning('Migration cancelled');
            process.exit(0);
        }
    }
}

async function detectProjectSetup(targetDir) {
    const packageJsonPath = path.join(targetDir, 'package.json');
    const setup = {
        useTailwind: false,
        usesTypeScript: false,
        usesReactRouter: false,
        cssFramework: 'none',
        packageManager: 'npm'
    };

    // Check for TypeScript
    setup.usesTypeScript = fs.existsSync(path.join(targetDir, 'tsconfig.json'));

    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // Detect package manager from lock files (in order of priority)
        if (fs.existsSync(path.join(targetDir, 'yarn.lock'))) {
            setup.packageManager = 'yarn';
        } else if (fs.existsSync(path.join(targetDir, 'pnpm-lock.yaml'))) {
            setup.packageManager = 'pnpm';
        } else if (fs.existsSync(path.join(targetDir, 'bun.lockb'))) {
            setup.packageManager = 'bun';
        }

        // Also check package.json for packageManager field (npm v7+)
        if (packageJson.packageManager) {
            const pmField = packageJson.packageManager;
            if (pmField.startsWith('yarn@')) {
                setup.packageManager = 'yarn';
            } else if (pmField.startsWith('pnpm@')) {
                setup.packageManager = 'pnpm';
            } else if (pmField.startsWith('bun@')) {
                setup.packageManager = 'bun';
            } else if (pmField.startsWith('npm@')) {
                setup.packageManager = 'npm';
            }
        }

        // Check for React Router
        setup.usesReactRouter = !!packageJson.dependencies?.['react-router-dom'] ||
            !!packageJson.dependencies?.['react-router'];

        // Detect CSS frameworks
        if (packageJson.dependencies?.tailwindcss || packageJson.devDependencies?.tailwindcss) {
            setup.useTailwind = true;
            setup.cssFramework = 'tailwind';
        } else if (packageJson.dependencies?.['styled-components']) {
            setup.cssFramework = 'styled-components';
        } else if (packageJson.dependencies?.['@emotion/react'] || packageJson.dependencies?.['@emotion/styled']) {
            setup.cssFramework = 'emotion';
        } else if (packageJson.dependencies?.['@mui/material']) {
            setup.cssFramework = 'mui';
        } else if (packageJson.dependencies?.['@chakra-ui/react']) {
            setup.cssFramework = 'chakra';
        }
    }

    // Check for Tailwind config files if not found in dependencies
    if (!setup.useTailwind) {
        const tailwindConfigPath = path.join(targetDir, 'tailwind.config.js');
        const tailwindConfigTsPath = path.join(targetDir, 'tailwind.config.ts');
        if (fs.existsSync(tailwindConfigPath) || fs.existsSync(tailwindConfigTsPath)) {
            setup.useTailwind = true;
            setup.cssFramework = 'tailwind';
        }

        if (!setup.useTailwind) {
            const postcssConfigPath = path.join(targetDir, 'postcss.config.js');
            if (fs.existsSync(postcssConfigPath)) {
                const content = fs.readFileSync(postcssConfigPath, 'utf8');
                if (content.includes('tailwindcss')) {
                    setup.useTailwind = true;
                    setup.cssFramework = 'tailwind';
                }
            }
        }
    }

    return setup;
}

async function runMigration(targetDir, options, projectSetup) {
    try {
        const startTime = Date.now();

        // Determine total steps based on project setup
        let totalSteps = 9; // Base steps
        if (projectSetup.usesReactRouter) totalSteps++;
        if (projectSetup.useTailwind) totalSteps++;

        logger.init(totalSteps);

        // Step 1: Cleanup phase - remove Vite files and dependencies
        await cleanupViteFiles(targetDir);

        // Step 2: Setup Next.js dependencies
        await migrateDependencies(targetDir, options.skipInstall, projectSetup);

        // Steps 3-5: Create Next.js configuration and structure
        await createNextConfig(targetDir, projectSetup);
        if (projectSetup.usesTypeScript) {
            await updateTsConfig(targetDir);
        }

        // Create root layout (handles CSS frameworks)
        await createRootLayout(targetDir, projectSetup);

        // Create entrypoint files
        await createEntrypoint(targetDir, projectSetup);

        // Additional migration steps for content and functionality
        await updateImageImports(targetDir);
        await migrateEnvVars(targetDir);
        await updatePackageJson(targetDir, projectSetup);

        // Optional steps based on project setup
        if (projectSetup.usesReactRouter) {
            await migrateReactRouter(targetDir, projectSetup);
        }

        await migrateStaticAssets(targetDir);

        displayCompletionMessage(startTime);
        displayNextSteps(projectSetup);
    } catch (error) {
        logger.error('Error during migration', error.message);
        console.error(error);
        process.exit(1);
    }
}

async function main() {
    try {
        displayBanner();

        program
            .name('vite2next')
            .description('CLI to migrate Vite projects to Next.js')
            .version('1.0.10')
            .argument('[project-directory]', 'Directory of the Vite project to migrate', '.')
            .option('-y, --yes', 'Skip confirmation prompts', false)
            .option('--skip-install', 'Skip installing dependencies', false)
            .option('--skip-tailwind-check', 'Skip Tailwind CSS requirement check', false)
            .option('--app-dir <dir>', 'Specify a custom source directory instead of src/app', '')
            .option('--next-version <version>', 'Specify Next.js version to use', '14.0.0')
            .option('--force-npm', 'Force using npm regardless of detected package manager', false)
            .option('--verbose', 'Show detailed logs during migration', false)
            .action(async (projectDir, options) => {
                try {
                    const targetDir = path.resolve(process.cwd(), projectDir);
                    const packageJsonPath = await validateProjectDirectory(targetDir);

                    await confirmViteProject(packageJsonPath, options.yes);

                    // Detect project setup
                    const projectSetup = await detectProjectSetup(targetDir);

                    // Override package manager if --force-npm is used
                    if (options.forceNpm) {
                        projectSetup.packageManager = 'npm';
                        logger.info('Forcing npm as package manager');
                    }

                    // Optional Tailwind check
                    if (!projectSetup.useTailwind && !options.skipTailwindCheck) {
                        const { proceed } = await inquirer.prompt([{
                            type: 'confirm',
                            name: 'proceed',
                            message: 'Tailwind CSS not detected in your project. The migration works best with Tailwind projects. Continue anyway?',
                            default: false
                        }]);

                        if (!proceed) {
                            logger.warning('Migration cancelled');
                            process.exit(0);
                        }
                    }

                    // Apply CLI options to the project setup
                    if (options.appDir) {
                        projectSetup.customAppDir = options.appDir;
                    }

                    if (options.nextVersion) {
                        projectSetup.nextVersion = options.nextVersion;
                    }

                    if (options.verbose) {
                        projectSetup.verbose = true;
                    }

                    logger.info(`Detected project configuration:`);
                    logger.detail(`- TypeScript: ${projectSetup.usesTypeScript ? 'Yes' : 'No'}`);
                    logger.detail(`- CSS Framework: ${projectSetup.cssFramework}`);
                    logger.detail(`- React Router: ${projectSetup.usesReactRouter ? 'Yes' : 'No'}`);
                    logger.detail(`- Package Manager: ${projectSetup.packageManager}`);

                    displayMigrationSteps();

                    await confirmMigration(options.yes);
                    await runMigration(targetDir, options, projectSetup);
                } catch (error) {
                    logger.error('Error during migration process', error.message);
                    if (projectSetup?.verbose) {
                        console.error(error);
                    }
                    process.exit(1);
                }
            });

        program.parse(process.argv);
    } catch (error) {
        logger.error('Unexpected error', error.message);
        console.error(error);
        process.exit(1);
    }
}

main().catch(error => {
    logger.error('Unexpected error', error.message);
    console.error(error);
    process.exit(1);
}); 