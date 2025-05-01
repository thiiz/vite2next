import chalk from 'chalk';
import fs from 'fs-extra';
import * as glob from 'glob';
import path from 'path';

export async function updateImageImports(targetDir) {
    console.log(chalk.blue('Step 7: Updating static image imports...'));

    try {
        // Find all JS/TS/JSX/TSX files
        const jsFiles = await glob.glob('**/*.{js,jsx,ts,tsx}', {
            cwd: targetDir,
            ignore: ['node_modules/**', '.git/**', 'dist/**', '.next/**']
        });

        if (jsFiles.length === 0) {
            console.log(chalk.yellow('i No JavaScript/TypeScript files found'));
            console.log(chalk.green('✓ Step 6 completed'));
            return true;
        }

        // Create types directory if it doesn't exist
        const typesDir = path.join(targetDir, 'types');
        await fs.ensureDir(typesDir);

        // Create image.d.ts file for TypeScript projects
        if (fs.existsSync(path.join(targetDir, 'tsconfig.json'))) {
            const imageDtsPath = path.join(typesDir, 'image.d.ts');
            const imageDtsContent = `declare module '*.png' {
  const src: string;
  export default { src };
}

declare module '*.jpg' {
  const src: string;
  export default { src };
}

declare module '*.jpeg' {
  const src: string;
  export default { src };
}

declare module '*.gif' {
  const src: string;
  export default { src };
}

declare module '*.svg' {
  const src: string;
  export default { src };
}

declare module '*.webp' {
  const src: string;
  export default { src };
}
`;
            await fs.writeFile(imageDtsPath, imageDtsContent);
            console.log(chalk.green('√ Created types/image.d.ts for image imports'));

            // Update tsconfig.json to include the new types
            const tsConfigPath = path.join(targetDir, 'tsconfig.json');
            const tsConfig = JSON.parse(await fs.readFile(tsConfigPath, 'utf8'));

            if (!tsConfig.include) {
                tsConfig.include = [];
            }

            if (!tsConfig.include.includes('./types/*.d.ts')) {
                tsConfig.include.push('./types/*.d.ts');
                await fs.writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2));
            }
        }

        console.log(chalk.yellow('! Image imports in your code may need to be updated manually'));
        console.log(chalk.gray('  For absolute imports from /public, use relative imports instead'));
        console.log(chalk.gray('  Example: import logo from \'/logo.png\' → import logo from \'../public/logo.png\''));
        console.log(chalk.gray('  For img tags, use the src property: <img src={logo.src} />'));

        console.log(chalk.green('✓ Step 6 completed'));
        return true;
    } catch (error) {
        console.error(chalk.red(`Error updating image imports: ${error.message}`));
        throw error;
    }
} 