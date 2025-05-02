import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import { logger } from './logger.js';

const execAsync = promisify(exec);

// Helper function to check if a command exists on the system
async function commandExists(command) {
    try {
        // Use "where" on Windows and "which" on Unix-like systems
        const checkCommand = process.platform === 'win32' ? `where ${command}` : `which ${command}`;
        await execAsync(checkCommand);
        return true;
    } catch (error) {
        return false;
    }
}

export async function migrateDependencies(targetDir, skipInstall, projectSetup) {
    logger.startStep('Installing Next.js dependencies');

    const packageJsonPath = path.join(targetDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    if (!packageJson.dependencies) {
        packageJson.dependencies = {};
    }

    logger.startSpinner('Adding necessary Next.js packages');

    let addedDeps = [];
    const nextVersion = projectSetup.nextVersion || '14.0.0';

    if (!packageJson.dependencies.next) {
        packageJson.dependencies.next = `^${nextVersion}`;
        addedDeps.push(`next@${nextVersion}`);
    } else {
        logger.info('Next.js is already a dependency');
    }

    if (!packageJson.dependencies.react) {
        packageJson.dependencies.react = '^18.2.0';
        addedDeps.push('react@18.2.0');
    }

    if (!packageJson.dependencies['react-dom']) {
        packageJson.dependencies['react-dom'] = '^18.2.0';
        addedDeps.push('react-dom@18.2.0');
    }

    // Check for and handle CSS frameworks
    if (projectSetup.cssFramework === 'tailwind' && !packageJson.devDependencies?.tailwindcss) {
        if (!packageJson.devDependencies) {
            packageJson.devDependencies = {};
        }

        // If project uses Tailwind but doesn't have it in dependencies, add it
        packageJson.devDependencies.tailwindcss = '^3.3.0';
        packageJson.devDependencies.autoprefixer = '^10.4.14';
        packageJson.devDependencies.postcss = '^8.4.23';
        addedDeps.push('tailwindcss@3.3.0 autoprefixer postcss');
        logger.detail('Added Tailwind CSS dependencies');
    }

    // Add CSS framework specific dependencies
    if (projectSetup.cssFramework === 'emotion' && !packageJson.dependencies?.['@emotion/styled']) {
        packageJson.dependencies['@emotion/styled'] = '^11.11.0';
        packageJson.dependencies['@emotion/react'] = '^11.11.0';
        addedDeps.push('@emotion/styled @emotion/react');
    } else if (projectSetup.cssFramework === 'styled-components' && !packageJson.dependencies?.['styled-components']) {
        packageJson.dependencies['styled-components'] = '^6.0.0';
        // Add the server-side styled-components integration for Next.js
        if (!packageJson.dependencies?.['next']) {
            packageJson.dependencies['next'] = `^${nextVersion}`;
        }
        addedDeps.push('styled-components');
    } else if (projectSetup.cssFramework === 'mui' && !packageJson.dependencies?.['@mui/material']) {
        packageJson.dependencies['@mui/material'] = '^5.14.0';
        packageJson.dependencies['@emotion/react'] = '^11.11.0';
        packageJson.dependencies['@emotion/styled'] = '^11.11.0';
        addedDeps.push('@mui/material @emotion/react @emotion/styled');
    }

    let hasReactRouter = projectSetup.usesReactRouter;
    if (hasReactRouter) {
        logger.info('Detected React Router dependency');
        logger.detail('Adding Next.js router compatibility layer');

        if (!packageJson.devDependencies) {
            packageJson.devDependencies = {};
        }
    }

    logger.stopSpinner(true, 'Dependencies configured');

    if (addedDeps.length > 0) {
        logger.success(`Added dependencies: ${addedDeps.join(', ')}`);
    }

    logger.startSpinner('Updating package.json');
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    logger.stopSpinner(true, 'package.json updated');

    if (!skipInstall) {
        // Remove incompatible lock files before installing
        const lockFiles = {
            'yarn.lock': 'yarn',
            'pnpm-lock.yaml': 'pnpm',
            'bun.lockb': 'bun',
            'package-lock.json': 'npm'
        };

        // Default to npm
        let packageManager = 'npm';
        const detectedManager = projectSetup.packageManager || 'npm';

        // First check if the detected package manager is available
        const managerAvailable = await commandExists(detectedManager);

        if (managerAvailable) {
            packageManager = detectedManager;
        } else if (detectedManager !== 'npm') {
            logger.warning(`${detectedManager} not found, falling back to npm`);

            // Remove the lock file for the unavailable package manager
            for (const [lockFile, manager] of Object.entries(lockFiles)) {
                if (manager === detectedManager) {
                    const lockPath = path.join(targetDir, lockFile);
                    if (fs.existsSync(lockPath)) {
                        try {
                            await fs.remove(lockPath);
                            logger.success(`Removed ${lockFile}`);
                        } catch (err) {
                            logger.warning(`Could not remove ${lockFile}: ${err.message}`);
                        }
                    }
                }
            }
        }

        // Set the appropriate install command
        let command;
        switch (packageManager) {
            case 'yarn':
                command = 'yarn';
                break;
            case 'pnpm':
                command = 'pnpm install';
                break;
            case 'bun':
                command = 'bun install';
                break;
            default:
                command = 'npm install';
        }

        const startTime = Date.now();
        logger.startSpinner(`Installing dependencies using ${packageManager}...`);

        try {
            await execAsync(command, { cwd: targetDir });

            const endTime = Date.now();
            const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);
            logger.stopSpinner(true, `Dependencies installed successfully in ${elapsedSeconds}s`);
        } catch (error) {
            logger.stopSpinner(false, 'Failed to install dependencies');
            logger.error('Installation failed', error.message);

            // If the detected package manager failed and it's not npm, try npm as a fallback
            if (packageManager !== 'npm') {
                logger.info('Attempting to install with npm as fallback...');

                // Remove any existing lock files before using npm
                for (const [lockFile, manager] of Object.entries(lockFiles)) {
                    if (manager !== 'npm') {
                        const lockPath = path.join(targetDir, lockFile);
                        if (fs.existsSync(lockPath)) {
                            try {
                                await fs.remove(lockPath);
                                logger.detail(`Removed ${lockFile} for npm compatibility`);
                            } catch (err) {
                                // Continue even if we can't remove the lock file
                            }
                        }
                    }
                }

                try {
                    await execAsync('npm install', { cwd: targetDir });
                    logger.success('Successfully installed dependencies with npm');
                } catch (npmError) {
                    logger.error('Fallback to npm also failed', npmError.message);
                    logger.detail('You may need to install dependencies manually');
                }
            } else {
                logger.detail('You may need to install dependencies manually');
            }
        }
    } else {
        logger.warning('Skipping dependency installation');
        logger.detail(`Run ${projectSetup.packageManager || 'npm'} install manually after migration`);
    }

    logger.stepComplete();
    return true;
} 