import chalk from 'chalk';
import fs from 'fs-extra';
import * as glob from 'glob';
import path from 'path';

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

export async function createRootLayout(targetDir, projectSetup) {
  console.log(chalk.blue('Step 5: Creating root layout...'));

  // Create src/app directory if it doesn't exist
  const srcDir = path.join(targetDir, 'src');
  await fs.ensureDir(srcDir);

  // Use custom app directory if specified, otherwise default to src/app
  const appDir = projectSetup.customAppDir
    ? path.join(targetDir, projectSetup.customAppDir)
    : path.join(srcDir, 'app');

  await fs.ensureDir(appDir);

  const usesTypeScript = projectSetup.usesTypeScript;
  const extension = usesTypeScript ? 'tsx' : 'jsx';

  // Check if files already exist
  const layoutFile = path.join(appDir, `layout.${extension}`);
  if (fs.existsSync(layoutFile)) {
    console.log(chalk.yellow('i Root layout file already exists, skipping creation'));
    return true;
  }

  // Find global CSS file
  const globalCssPath = await findGlobalCss(targetDir);

  // Create proper relative path for CSS imports if a global CSS file is found
  let cssImportPath = null;
  if (globalCssPath) {
    // Convert absolute file path to a proper relative import path from app directory
    const absoluteCssPath = path.resolve(targetDir, globalCssPath);
    const appDirPath = path.resolve(appDir);
    cssImportPath = path.relative(appDirPath, absoluteCssPath);

    // Convert Windows backslashes to forward slashes for proper import path
    cssImportPath = cssImportPath.replace(/\\/g, '/');

    // Ensure the path starts with './' or '../'
    if (!cssImportPath.startsWith('./') && !cssImportPath.startsWith('../')) {
      cssImportPath = './' + cssImportPath;
    }
  }

  // Create layout file based on CSS framework
  let layoutContent;

  if (projectSetup.cssFramework === 'tailwind') {
    layoutContent = createTailwindLayout(cssImportPath, usesTypeScript);
  } else if (projectSetup.cssFramework === 'styled-components') {
    layoutContent = createStyledComponentsLayout(usesTypeScript);
  } else if (projectSetup.cssFramework === 'emotion') {
    layoutContent = createEmotionLayout(usesTypeScript);
  } else if (projectSetup.cssFramework === 'mui') {
    layoutContent = createMuiLayout(usesTypeScript);
  } else if (projectSetup.cssFramework === 'chakra') {
    layoutContent = createChakraLayout(usesTypeScript);
  } else {
    // Default with just global CSS if found
    layoutContent = createBasicLayout(cssImportPath, usesTypeScript);
  }

  await fs.writeFile(layoutFile, layoutContent);
  console.log(chalk.green(`√ Created root layout: src/app/layout.${extension}`));

  // If using TypeScript, create project-specific type declarations
  if (usesTypeScript) {
    await createTypeDeclarations(targetDir);
  }

  console.log(chalk.green('✓ Step 5 completed'));
  return true;
}

function createBasicLayout(cssImportPath, usesTypeScript) {
  const styleImport = cssImportPath ? `import '${cssImportPath}';` : '';
  const typeDef = usesTypeScript ?
    `\nexport type Metadata = {
    title: string;
    description: string;
  };

  export const metadata: Metadata = {
    title: 'Next.js App',
    description: 'Created with vite2next',
  };
  ` : '';

  return `${styleImport}

${typeDef}export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>${cssImportPath ? '' : '\n        <div className="app-container">'}{children}${cssImportPath ? '' : '\n        </div>'}
      </body>
    </html>
  );
}`;
}

function createTailwindLayout(cssImportPath, usesTypeScript) {
  const styleImport = cssImportPath ? `import '${cssImportPath}';` : `import './globals.css';`;
  const typeDef = usesTypeScript ?
    `\nexport type Metadata = {
    title: string;
    description: string;
  };

  export const metadata: Metadata = {
    title: 'Next.js App',
    description: 'Created with vite2next',
  };
  ` : '';

  return `${styleImport}

${typeDef}export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        {children}
      </body>
    </html>
  );
}`;
}

function createStyledComponentsLayout(usesTypeScript) {
  const typeDef = usesTypeScript ?
    `\nexport type Metadata = {
    title: string;
    description: string;
  };

  export const metadata: Metadata = {
    title: 'Next.js App',
    description: 'Created with vite2next',
  };
  ` : '';

  return `'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { useStyledComponentsRegistry } from '../lib/styled-components-registry';

${typeDef}export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const styledComponentsRegistry = useStyledComponentsRegistry();

  return (
    <html lang="en">
      <body>
        {styledComponentsRegistry.styles}
        <div id="root">{children}</div>
      </body>
    </html>
  );
}`;
}

function createEmotionLayout(usesTypeScript) {
  const typeDef = usesTypeScript ?
    `\nexport type Metadata = {
    title: string;
    description: string;
  };

  export const metadata: Metadata = {
    title: 'Next.js App',
    description: 'Created with vite2next',
  };
  ` : '';

  return `'use client';

import { CacheProvider } from '@emotion/react';
import { useEmotionCache } from '../lib/emotion-cache';

${typeDef}export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cache = useEmotionCache();

  return (
    <html lang="en">
      <body>
        <CacheProvider value={cache}>
          <div id="root">{children}</div>
        </CacheProvider>
      </body>
    </html>
  );
}`;
}

function createMuiLayout(usesTypeScript) {
  const typeDef = usesTypeScript ?
    `\nexport type Metadata = {
    title: string;
    description: string;
  };

  export const metadata: Metadata = {
    title: 'Next.js App',
    description: 'Created with vite2next',
  };
  ` : '';

  return `'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '../lib/mui-theme';

${typeDef}export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div id="root">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}`;
}

function createChakraLayout(usesTypeScript) {
  const typeDef = usesTypeScript ?
    `\nexport type Metadata = {
    title: string;
    description: string;
  };

  export const metadata: Metadata = {
    title: 'Next.js App',
    description: 'Created with vite2next',
  };
  ` : '';

  return `'use client';

import { ChakraProvider } from '@chakra-ui/react';

${typeDef}export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ChakraProvider>
          <div id="root">{children}</div>
        </ChakraProvider>
      </body>
    </html>
  );
}`;
}

async function createTypeDeclarations(targetDir) {
  try {
    // Check if src directory exists
    const srcDir = path.join(targetDir, 'src');
    if (!fs.existsSync(srcDir)) {
      console.log(chalk.yellow('i No src directory found, skipping type declarations'));
      return;
    }

    // Create types directory if it doesn't exist
    const typesDir = path.join(srcDir, 'types');
    await fs.ensureDir(typesDir);

    // Create global.d.ts file with common type declarations
    const globalDtsPath = path.join(typesDir, 'global.d.ts');
    if (!fs.existsSync(globalDtsPath)) {
      const globalDtsContent = `// Global type declarations for the project

// This allows importing CSS modules
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// For importing non-code assets in TypeScript
declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement>
  >;
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.mp4' {
  const src: string;
  export default src;
}

declare module '*.webm' {
  const src: string;
  export default src;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.sass' {
  const classes: { [key: string]: string };
  export default classes;
}`;

      await fs.writeFile(globalDtsPath, globalDtsContent);
      console.log(chalk.green('√ Created global type declarations'));
    }
  } catch (error) {
    console.warn(chalk.yellow('! Error creating type declarations: '), error.message);
  }
} 