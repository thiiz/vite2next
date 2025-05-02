import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export async function createNextConfig(targetDir, projectSetup) {
    console.log(chalk.blue('Step 3: Creating Next.js configuration...'));

    const nextConfigPath = path.join(targetDir, 'next.config.js');
    if (fs.existsSync(nextConfigPath)) {
        console.log(chalk.yellow('i next.config.js already exists, skipping creation'));
        return true;
    }

    let configContent = '';

    // Create appropriate Next.js config based on CSS framework and other requirements
    if (projectSetup.cssFramework === 'styled-components') {
        // For styled-components, create a registry file
        await createStyledComponentsRegistry(targetDir, projectSetup.usesTypeScript);

        configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
}

export default nextConfig;`;
    } else if (projectSetup.cssFramework === 'emotion') {
        // For emotion, create a cache file
        await createEmotionCache(targetDir, projectSetup.usesTypeScript);

        configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
}

export default nextConfig;`;
    } else if (projectSetup.cssFramework === 'mui') {
        // For MUI, create a theme file
        await createMuiTheme(targetDir, projectSetup.usesTypeScript);

        configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
}

export default nextConfig;`;
    } else {
        // Default config (works for Tailwind, Chakra, and projects without CSS frameworks)
        configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
}

export default nextConfig;`;
    }

    await fs.writeFile(nextConfigPath, configContent);
    console.log(chalk.green('√ Created next.config.js'));

    await createGitIgnore(targetDir);

    console.log(chalk.green('✓ Step 3 completed'));
    return true;
}

async function createGitIgnore(targetDir) {
    const gitignorePath = path.join(targetDir, '.gitignore');
    let gitignoreContent = '';
    let gitignoreUpdated = false;

    // Create if doesn't exist
    if (fs.existsSync(gitignorePath)) {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
    }

    // Add Next.js related entries
    const nextEntries = [
        '.next',
        'next-env.d.ts',
        '.vercel',
        '.env*.local'
    ];

    const missingEntries = nextEntries.filter(entry => !gitignoreContent.includes(entry));

    if (missingEntries.length > 0) {
        gitignoreContent += '\n# Next.js\n' + missingEntries.join('\n') + '\n';
        gitignoreUpdated = true;
    }

    if (gitignoreUpdated) {
        await fs.writeFile(gitignorePath, gitignoreContent);
        console.log(chalk.green('√ Updated .gitignore with Next.js entries'));
    }
}

async function createStyledComponentsRegistry(targetDir, usesTypeScript) {
    const ext = usesTypeScript ? 'tsx' : 'jsx';
    const libDir = path.join(targetDir, 'src', 'lib');
    await fs.ensureDir(libDir);

    const registryPath = path.join(libDir, `styled-components-registry.${ext}`);
    const registryContent = `'use client';

import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';

export function useStyledComponentsRegistry() {
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement();
    styledComponentsStyleSheet.instance.clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== 'undefined') return { styles: null, StyleProvider: React.Fragment };

  return {
    styles: null,
    StyleProvider: ({ children }) => (
      <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>
        {children}
      </StyleSheetManager>
    ),
  };
}`;

    await fs.writeFile(registryPath, registryContent);
    console.log(chalk.green(`√ Created styled-components registry in src/lib/styled-components-registry.${ext}`));
}

async function createEmotionCache(targetDir, usesTypeScript) {
    const ext = usesTypeScript ? 'tsx' : 'jsx';
    const libDir = path.join(targetDir, 'src', 'lib');
    await fs.ensureDir(libDir);

    const cachePath = path.join(libDir, `emotion-cache.${ext}`);
    const cacheContent = `'use client';

import { useState } from 'react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';

export const useEmotionCache = () => {
  const [cache] = useState(() => {
    const cache = createCache({ key: 'css' });
    cache.compat = true;
    return cache;
  });

  useServerInsertedHTML(() => {
    const extractedStyles = cache.extract();
    if (extractedStyles.length === 0) {
      return null;
    }
    return (
      <style
        data-emotion={cache.key}
        dangerouslySetInnerHTML={{
          __html: extractedStyles,
        }}
      />
    );
  });

  return cache;
};`;

    await fs.writeFile(cachePath, cacheContent);
    console.log(chalk.green(`√ Created emotion cache in src/lib/emotion-cache.${ext}`));
}

async function createMuiTheme(targetDir, usesTypeScript) {
    const ext = usesTypeScript ? 'ts' : 'js';
    const libDir = path.join(targetDir, 'src', 'lib');
    await fs.ensureDir(libDir);

    const themePath = path.join(libDir, `mui-theme.${ext}`);
    const themeContent = `import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
});`;

    await fs.writeFile(themePath, themeContent);
    console.log(chalk.green(`√ Created MUI theme in src/lib/mui-theme.${ext}`));
} 