import chalk from 'chalk';
import fs from 'fs-extra';
import * as glob from 'glob';
import path from 'path';

export async function migrateEnvVars(targetDir) {
    console.log(chalk.blue('Step 8: Migrating environment variables...'));

    // Process .env files
    const envFiles = await glob.glob('.env*', { cwd: targetDir });

    if (envFiles.length === 0) {
        console.log(chalk.yellow('i No .env files found'));
    } else {
        let hasChanges = false;

        for (const envFile of envFiles) {
            const envPath = path.join(targetDir, envFile);
            const envContent = await fs.readFile(envPath, 'utf8');

            // Replace VITE_ with NEXT_PUBLIC_
            const updatedContent = envContent.replace(/VITE_/g, 'NEXT_PUBLIC_');

            if (updatedContent !== envContent) {
                await fs.writeFile(envPath, updatedContent);
                console.log(chalk.green(`√ Updated ${envFile} (VITE_ → NEXT_PUBLIC_)`));
                hasChanges = true;
            }

            // Check for BASE_URL in environment variables
            if (envContent.includes('BASE_URL=') && !envContent.includes('NEXT_PUBLIC_BASE_PATH=')) {
                const baseUrlMatch = envContent.match(/BASE_URL=([^\n]+)/);
                if (baseUrlMatch && baseUrlMatch[1]) {
                    const baseUrl = baseUrlMatch[1];

                    // Append NEXT_PUBLIC_BASE_PATH
                    await fs.appendFile(
                        envPath,
                        `\n# Added by vite-to-next migration\nNEXT_PUBLIC_BASE_PATH=${baseUrl}\n`
                    );

                    console.log(chalk.green(`√ Added NEXT_PUBLIC_BASE_PATH to ${envFile}`));
                    hasChanges = true;
                }
            }
        }

        if (!hasChanges) {
            console.log(chalk.yellow('i No changes needed for .env files'));
        }
    }

    // Look for import.meta.env usages in files
    console.log(chalk.gray('Checking for import.meta.env usages in files...'));

    const jsFiles = await glob.glob('**/*.{js,jsx,ts,tsx}', {
        cwd: targetDir,
        ignore: ['node_modules/**', '.git/**', 'dist/**', '.next/**']
    });

    let hasImportMetaEnv = false;

    for (const file of jsFiles) {
        const filePath = path.join(targetDir, file);
        const content = await fs.readFile(filePath, 'utf8');

        if (content.includes('import.meta.env')) {
            console.log(chalk.yellow(`! Found import.meta.env usage in ${file}`));
            hasImportMetaEnv = true;
        }
    }

    if (hasImportMetaEnv) {
        console.log(chalk.yellow('! You need to update import.meta.env usages manually:'));
        console.log(chalk.gray('  import.meta.env.MODE → process.env.NODE_ENV'));
        console.log(chalk.gray('  import.meta.env.PROD → process.env.NODE_ENV === \'production\''));
        console.log(chalk.gray('  import.meta.env.DEV → process.env.NODE_ENV !== \'production\''));
        console.log(chalk.gray('  import.meta.env.SSR → typeof window === \'undefined\''));
        console.log(chalk.gray('  import.meta.env.VITE_* → process.env.NEXT_PUBLIC_*'));
    } else {
        console.log(chalk.green('√ No import.meta.env usages found'));
    }

    console.log(chalk.green('✓ Step 7 completed'));
    return true;
} 