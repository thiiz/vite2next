import chalk from 'chalk';
import fs from 'fs-extra';
import * as glob from 'glob';
import path from 'path';

export async function createEntrypoint(targetDir) {
    console.log(chalk.blue('Step 6: Creating entrypoint page...'));

    // Create app directory if it doesn't exist
    const appDir = path.join(targetDir, 'app');
    await fs.ensureDir(appDir);

    const usesTypeScript = fs.existsSync(path.join(targetDir, 'tsconfig.json'));
    const extension = usesTypeScript ? 'tsx' : 'jsx';

    // First, try to detect if there's a more appropriate page structure
    // Check for React Router usage to decide on approach
    const packageJsonPath = path.join(targetDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    const usesReactRouter = packageJson.dependencies?.['react-router-dom'] || packageJson.dependencies?.['react-router'];

    // Default to catchall route approach for SPA style
    if (usesReactRouter) {
        console.log(chalk.yellow('i React Router detected - using catchall route approach for compatibility'));
        await createCatchAllPage(targetDir, appDir, extension);
    } else {
        // Check if files already exist
        const pageFile = path.join(appDir, `page.${extension}`);
        const layoutFile = path.join(appDir, `layout.${extension}`);

        if (fs.existsSync(pageFile)) {
            console.log(chalk.yellow('i Root page file already exists, skipping creation'));
            return true;
        }

        // Look for main React component file (App.jsx, App.tsx, etc.)
        let appComponentPath = await findAppComponent(targetDir);

        if (appComponentPath) {
            console.log(chalk.gray(`Found App component: ${appComponentPath}`));
            await createDirectPage(targetDir, appDir, extension, appComponentPath);
        } else {
            console.log(chalk.yellow('! Could not find App component, creating fallback page'));
            await createFallbackPage(targetDir, appDir, extension);
        }
    }

    console.log(chalk.green('✓ Step 5 completed'));
    return true;
}

async function findAppComponent(targetDir) {
    const appFilePatterns = ['App.jsx', 'App.tsx', 'App.js', 'App.tsx', 'app.jsx', 'app.tsx', 'app.js', 'app.ts'];

    for (const pattern of appFilePatterns) {
        const files = await glob.glob(`**/${pattern}`, {
            cwd: targetDir,
            ignore: ['node_modules/**', '.git/**', 'dist/**', '.next/**', 'app/**']
        });

        if (files.length > 0) {
            return files[0];
        }
    }

    // Try to check main.js/ts for the app component import
    const mainFilePatterns = ['main.jsx', 'main.tsx', 'main.js', 'main.ts', 'index.jsx', 'index.tsx', 'index.js', 'index.ts'];

    for (const pattern of mainFilePatterns) {
        const files = await glob.glob(`**/${pattern}`, {
            cwd: targetDir,
            ignore: ['node_modules/**', '.git/**', 'dist/**', '.next/**', 'app/**']
        });

        if (files.length > 0) {
            // Read the main file to find App import
            const mainFilePath = path.join(targetDir, files[0]);
            try {
                const content = await fs.readFile(mainFilePath, 'utf8');

                // Look for import of App component
                const importMatch = content.match(/import\s+(\w+)\s+from\s+['"](.+App)['"];?/);
                if (importMatch) {
                    const appPath = importMatch[2];

                    // Convert relative path to absolute
                    let appFullPath = appPath;
                    if (appPath.startsWith('./') || appPath.startsWith('../')) {
                        appFullPath = path.join(path.dirname(mainFilePath), appPath);
                        // Make it relative to targetDir
                        appFullPath = path.relative(targetDir, appFullPath);
                    }

                    return appFullPath;
                }
            } catch (error) {
                console.error(chalk.yellow(`Error reading main file: ${error.message}`));
            }
        }
    }

    return null;
}

async function findGlobalCss(targetDir) {
    let cssFiles = await glob.glob('**/*.css', {
        cwd: targetDir,
        ignore: ['node_modules/**', '.git/**', 'dist/**', '.next/**', 'app/**']
    });

    // Look for common global CSS files
    const globalCssFiles = cssFiles.filter(file => {
        const filename = path.basename(file).toLowerCase();
        return filename === 'index.css' ||
            filename === 'global.css' ||
            filename === 'globals.css' ||
            filename === 'app.css' ||
            filename === 'style.css' ||
            filename === 'styles.css';
    });

    if (globalCssFiles.length > 0) {
        return globalCssFiles[0];
    }

    return null;
}

async function createCatchAllPage(targetDir, appDir, extension) {
    // Create app/[[...slug]] directory for catch-all routes
    const slugDir = path.join(appDir, '[[...slug]]');
    await fs.ensureDir(slugDir);

    // Check if files already exist
    const pageFile = path.join(slugDir, `page.${extension}`);
    const clientFile = path.join(slugDir, `client.${extension}`);

    if (fs.existsSync(pageFile) && fs.existsSync(clientFile)) {
        console.log(chalk.yellow('i Catch-all route files already exist, skipping creation'));
        return;
    }

    // Find global CSS file for importing
    const globalCssFile = await findGlobalCss(targetDir);
    let cssImport = '';

    if (globalCssFile) {
        // Normalize path to use forward slashes for imports
        const normalizedCssPath = `../../${globalCssFile}`.replace(/\\/g, '/');
        cssImport = `import '${normalizedCssPath}'\n`;
        console.log(chalk.gray(`Found global CSS file: ${globalCssFile}`));
    }

    // Find the app component
    let appPath = await findAppComponent(targetDir);
    if (!appPath) {
        console.log(chalk.yellow('! Could not find App component file, you may need to adjust the import path manually'));
        appPath = 'App';
    } else {
        // Convert to import path with normalized slashes
        appPath = '../../' + appPath.replace(/\.[jt]sx?$/, '');
        appPath = appPath.replace(/\\/g, '/');
    }

    // Create client.tsx/jsx
    const clientContent = `'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const App = dynamic(() => import('${appPath}'), { ssr: false })

export function ClientOnly() {
  return <App />
}`;

    await fs.writeFile(clientFile, clientContent);
    console.log(chalk.green(`√ Created app/[[...slug]]/client.${extension}`));

    // Create page.tsx/jsx
    const pageContent = `${cssImport}import { ClientOnly } from './client'

export function generateStaticParams() {
  return [{ slug: [''] }]
}

export default function Page() {
  return <ClientOnly />
}`;

    await fs.writeFile(pageFile, pageContent);
    console.log(chalk.green(`√ Created app/[[...slug]]/page.${extension}`));
}

async function createDirectPage(targetDir, appDir, extension, appComponentPath) {
    // Create a direct page.tsx/jsx for simpler apps
    const pageFile = path.join(appDir, `page.${extension}`);

    // Find global CSS file for importing
    const globalCssFile = await findGlobalCss(targetDir);
    let cssImport = '';

    if (globalCssFile) {
        // Normalize path to use forward slashes for imports
        const normalizedCssPath = `../${globalCssFile}`.replace(/\\/g, '/');
        cssImport = `import '${normalizedCssPath}'\n`;
        console.log(chalk.gray(`Found global CSS file: ${globalCssFile}`));
    }

    // Convert to import path relative to app directory
    let appImportPath = '../' + appComponentPath.replace(/\.[jt]sx?$/, '');
    // Normalize path to use forward slashes for imports
    appImportPath = appImportPath.replace(/\\/g, '/');

    // Create page content
    const pageContent = `'use client'

${cssImport}import dynamic from 'next/dynamic'

const App = dynamic(() => import('${appImportPath}'), { ssr: false })

export default function Home() {
  return <App />
}`;

    await fs.writeFile(pageFile, pageContent);
    console.log(chalk.green(`√ Created app/page.${extension}`));
}

async function createFallbackPage(targetDir, appDir, extension) {
    // Create a fallback page when no App component is found
    const pageFile = path.join(appDir, `page.${extension}`);

    // Find global CSS file for importing
    const globalCssFile = await findGlobalCss(targetDir);
    let cssImport = '';

    if (globalCssFile) {
        // Normalize path to use forward slashes for imports
        const normalizedCssPath = `../${globalCssFile}`.replace(/\\/g, '/');
        cssImport = `import '${normalizedCssPath}'\n`;
        console.log(chalk.gray(`Found global CSS file: ${globalCssFile}`));
    }

    // Create a simple fallback page
    const pageContent = `'use client'

${cssImport}export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      textAlign: 'center',
      padding: '0 1rem'
    }}>
      <h1>Vite to Next.js Migration Complete</h1>
      <p>
        This is a fallback page. Your app components were not automatically detected.
      </p>
      <p>
        To continue, create your pages in the <code>app</code> directory following the
        <a href="https://nextjs.org/docs/app/building-your-application/routing" 
           style={{ marginLeft: '0.5rem' }}>
          Next.js App Router documentation
        </a>.
      </p>
    </div>
  )
}`;

    await fs.writeFile(pageFile, pageContent);
    console.log(chalk.green(`√ Created fallback app/page.${extension}`));
} 