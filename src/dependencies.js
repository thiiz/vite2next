import chalk from 'chalk';
import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function migrateDependencies(targetDir, skipInstall) {
    console.log(chalk.blue('Step 2: Installing Next.js dependencies...'));

    const packageJsonPath = path.join(targetDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    if (!packageJson.dependencies) {
        packageJson.dependencies = {};
    }

    if (!packageJson.dependencies.next) {
        packageJson.dependencies.next = '^14.0.0';
        console.log(chalk.green('√ Added next@latest to dependencies'));
    } else {
        console.log(chalk.yellow('i Next.js is already a dependency'));
    }

    if (!packageJson.dependencies.react) {
        packageJson.dependencies.react = '^18.2.0';
        console.log(chalk.green('√ Added react to dependencies'));
    }

    if (!packageJson.dependencies['react-dom']) {
        packageJson.dependencies['react-dom'] = '^18.2.0';
        console.log(chalk.green('√ Added react-dom to dependencies'));
    }

    if (packageJson.dependencies?.['react-router-dom'] || packageJson.dependencies?.['react-router']) {
        console.log(chalk.yellow('i Detected React Router dependency'));
        console.log(chalk.gray('  Adding Next.js router compatibility layer'));

        if (!packageJson.devDependencies) {
            packageJson.devDependencies = {};
        }
    }

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    if (!skipInstall) {
        const packageManager = fs.existsSync(path.join(targetDir, 'yarn.lock'))
            ? 'yarn'
            : fs.existsSync(path.join(targetDir, 'pnpm-lock.yaml'))
                ? 'pnpm'
                : 'npm';

        const command = packageManager === 'npm'
            ? 'npm install'
            : packageManager === 'yarn'
                ? 'yarn'
                : 'pnpm install';

        const startTime = Date.now();
        console.log(chalk.blue(`Installing dependencies using ${packageManager}...`));

        try {
            await execAsync(command, { cwd: targetDir });

            const endTime = Date.now();
            const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);
            console.log(chalk.green(`√ Dependencies installed successfully in ${elapsedSeconds}s`));
        } catch (error) {
            console.error(chalk.yellow('! Failed to install dependencies'));
            console.error(chalk.gray('  You may need to install them manually'));
            console.error(chalk.gray(`  Error: ${error.message}`));
        }
    } else {
        console.log(chalk.yellow('i Skipping dependency installation'));
    }

    console.log(chalk.green('✓ Step 1 completed'));
    return true;
} 