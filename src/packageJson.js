import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export async function updatePackageJson(targetDir) {
    console.log(chalk.blue('Step 9: Updating package.json scripts...'));

    const packageJsonPath = path.join(targetDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    // Initialize scripts object if it doesn't exist
    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }

    // Update or add Next.js scripts
    let updated = false;

    // Update dev script
    if (packageJson.scripts.dev && !packageJson.scripts.dev.includes('next dev')) {
        console.log(chalk.gray(`Replacing dev script: "${packageJson.scripts.dev}" → "next dev"`));
        packageJson.scripts.dev = 'next dev';
        updated = true;
    } else if (!packageJson.scripts.dev) {
        packageJson.scripts.dev = 'next dev';
        console.log(chalk.green('√ Added dev script: "next dev"'));
        updated = true;
    }

    // Update build script
    if (packageJson.scripts.build && !packageJson.scripts.build.includes('next build')) {
        console.log(chalk.gray(`Replacing build script: "${packageJson.scripts.build}" → "next build"`));
        packageJson.scripts.build = 'next build';
        updated = true;
    } else if (!packageJson.scripts.build) {
        packageJson.scripts.build = 'next build';
        console.log(chalk.green('√ Added build script: "next build"'));
        updated = true;
    }

    // Update start script
    if (packageJson.scripts.start && !packageJson.scripts.start.includes('next start')) {
        console.log(chalk.gray(`Replacing start script: "${packageJson.scripts.start}" → "next start"`));
        packageJson.scripts.start = 'next start';
        updated = true;
    } else if (!packageJson.scripts.start) {
        packageJson.scripts.start = 'next start';
        console.log(chalk.green('√ Added start script: "next start"'));
        updated = true;
    }

    // Add or update .gitignore for Next.js files
    const gitignorePath = path.join(targetDir, '.gitignore');
    let gitignoreContent = '';
    let gitignoreUpdated = false;

    // Create if doesn't exist
    if (fs.existsSync(gitignorePath)) {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
    }

    // Add Next.js related entries
    const nextEntries = ['.next', 'next-env.d.ts', 'dist'];
    for (const entry of nextEntries) {
        if (!gitignoreContent.includes(entry)) {
            gitignoreContent += `\n# Next.js\n${entry}\n`;
            gitignoreUpdated = true;
        }
    }

    if (gitignoreUpdated) {
        await fs.writeFile(gitignorePath, gitignoreContent);
        console.log(chalk.green('√ Updated .gitignore with Next.js entries'));
    }

    if (updated) {
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log(chalk.green('√ Updated package.json scripts'));
    } else {
        console.log(chalk.yellow('i No changes needed for package.json scripts'));
    }

    console.log(chalk.green('✓ Step 8 completed'));
    return true;
} 