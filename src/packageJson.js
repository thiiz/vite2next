import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export async function updatePackageJson(targetDir, projectSetup) {
    console.log(chalk.blue('Step 9: Updating package.json...'));

    const packageJsonPath = path.join(targetDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    console.log(chalk.gray('Updating scripts for Next.js...'));

    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }

    // Update scripts for Next.js
    packageJson.scripts.dev = 'next dev';
    packageJson.scripts.build = 'next build';
    packageJson.scripts.start = 'next start';
    packageJson.scripts.lint = packageJson.scripts.lint || 'next lint';

    // Add browserslist config if it doesn't exist
    if (!packageJson.browserslist) {
        packageJson.browserslist = [
            "last 2 versions",
            "> 1%",
            "not dead"
        ];
    }

    // Set or update the type field if using TypeScript
    if (projectSetup.usesTypeScript) {
        packageJson.type = "module";
    }

    // Set correct engines field for Next.js
    if (!packageJson.engines) {
        packageJson.engines = {};
    }
    packageJson.engines.node = ">=18.17.0";

    // Remove Vite-specific entries
    delete packageJson.scripts['dev:host'];
    delete packageJson.scripts['vite'];

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    console.log(chalk.green('√ Updated package.json'));
    console.log(chalk.green('✓ Step 9 completed'));
    return true;
} 