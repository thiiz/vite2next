import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export async function createNextConfig(targetDir) {
    console.log(chalk.blue('Step 3: Creating Next.js configuration file...'));

    const nextConfigPath = path.join(targetDir, 'next.config.mjs');

    // Check if next.config.mjs already exists
    if (fs.existsSync(nextConfigPath)) {
        console.log(chalk.yellow('i next.config.mjs already exists, skipping creation'));
        return true;
    }

    // Try to find and parse Vite config to migrate settings
    let viteConfig = null;
    const viteConfigPaths = [
        path.join(targetDir, 'vite.config.js'),
        path.join(targetDir, 'vite.config.ts'),
        path.join(targetDir, 'vite.config.mjs'),
        path.join(targetDir, 'vite.config.mts')
    ];

    for (const configPath of viteConfigPaths) {
        if (fs.existsSync(configPath)) {
            try {
                // We can't directly import the config due to potential dependencies
                // Just read it as text and extract some common patterns
                const configContent = await fs.readFile(configPath, 'utf8');

                // Try to extract basePath and any other useful settings
                viteConfig = parseViteConfig(configContent);
                console.log(chalk.gray(`Found Vite config at ${path.basename(configPath)}`));
                break;
            } catch (error) {
                console.error(chalk.yellow(`Could not parse Vite config: ${error.message}`));
            }
        }
    }

    // Get environment variables from .env file to check for BASE_URL
    let basePath = null;
    const envPath = path.join(targetDir, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = await fs.readFile(envPath, 'utf8');
        const baseUrlMatch = envContent.match(/BASE_URL=([^\n]+)/);
        const basePathMatch = envContent.match(/BASE_PATH=([^\n]+)/);

        if (baseUrlMatch && baseUrlMatch[1]) {
            basePath = baseUrlMatch[1].trim();
        } else if (basePathMatch && basePathMatch[1]) {
            basePath = basePathMatch[1].trim();
        }
    }

    // Use basePath from Vite config if found
    if (viteConfig?.base && !basePath) {
        basePath = viteConfig.base;
    }

    // Clean up basePath if it exists
    if (basePath) {
        // Remove quotes if present
        basePath = basePath.replace(/^['"](.*)['"]$/, '$1');

        // Make sure it starts with '/' and doesn't end with '/'
        if (!basePath.startsWith('/')) {
            basePath = '/' + basePath;
        }
        if (basePath.endsWith('/') && basePath.length > 1) {
            basePath = basePath.slice(0, -1);
        }

        // Special case - if it's just "/" then we don't need a basePath
        if (basePath === '/') {
            basePath = null;
        }
    }

    // Create next.config.mjs content with appropriate settings
    const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Outputs a Single-Page Application (SPA).
  distDir: './dist', // Changes the build output directory to \`./dist/\`.${basePath ? `\n  basePath: '${basePath}', // Sets the base path` : ''}${viteConfig?.publicDir ? `\n  // Note: Next.js uses 'public' directory for static assets` : ''}
  
  // Configure additional settings as needed:
  // images: { unoptimized: true }, // If you're using static export
  // experimental: { appDir: true }, // Enable App Router (already default in Next.js 13+)
}

export default nextConfig;
`;

    // Write next.config.mjs file
    await fs.writeFile(nextConfigPath, nextConfigContent);
    console.log(chalk.green('√ Created next.config.mjs'));

    console.log(chalk.green('✓ Step 2 completed'));
    return true;
}

function parseViteConfig(configContent) {
    const config = {
        base: null,
        publicDir: null,
        outDir: null
    };

    // Extract base path
    const baseMatch = configContent.match(/base:\s*['"]([^'"]+)['"]/);
    if (baseMatch) {
        config.base = baseMatch[1];
    }

    // Extract public directory
    const publicDirMatch = configContent.match(/publicDir:\s*['"]([^'"]+)['"]/);
    if (publicDirMatch) {
        config.publicDir = publicDirMatch[1];
    }

    // Extract output directory
    const outDirMatch = configContent.match(/(?:outDir|build\.outDir):\s*['"]([^'"]+)['"]/);
    if (outDirMatch) {
        config.outDir = outDirMatch[1];
    }

    return config;
} 