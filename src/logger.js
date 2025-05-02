import chalk from 'chalk';
import ora from 'ora';

const spinner = ora();
let stepCount = 0;
let totalSteps = 0;

export const logger = {
    init(steps) {
        totalSteps = steps;
        stepCount = 0;
    },

    startStep(message) {
        stepCount++;
        console.log('');
        console.log(chalk.blue.bold(`Step ${stepCount}/${totalSteps}: ${message}`));
        return stepCount;
    },

    startSpinner(text) {
        spinner.text = text;
        spinner.start();
    },

    stopSpinner(success = true, text) {
        if (success) {
            spinner.succeed(text);
        } else {
            spinner.fail(text);
        }
    },

    success(message) {
        console.log(chalk.green(`  ✓ ${message}`));
    },

    warning(message) {
        console.log(chalk.yellow(`  ⚠ ${message}`));
    },

    error(message, details) {
        console.log(chalk.red(`  ✖ ${message}`));
        if (details) {
            console.log(chalk.gray(`    ${details}`));
        }
    },

    info(message) {
        console.log(chalk.cyan(`  ℹ ${message}`));
    },

    detail(message) {
        console.log(chalk.gray(`    ${message}`));
    },

    stepComplete() {
        console.log(chalk.green.bold(`  ✓ Step ${stepCount} completed`));
    },

    divider() {
        console.log(chalk.gray('  ' + '-'.repeat(50)));
    },

    newLine() {
        console.log('');
    },

    progressBar(current, total, message) {
        const width = 30;
        const percentage = Math.round((current / total) * 100);
        const filledWidth = Math.round((current / total) * width);
        const emptyWidth = width - filledWidth;

        const bar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
        console.log(`  ${bar} ${percentage}% | ${message}`);
    }
};

export function displayBanner() {
    console.log('');
    console.log(chalk.blue.bold('┌─────────────────────────────────────────┐'));
    console.log(chalk.blue.bold('│                                         │'));
    console.log(chalk.blue.bold('│        vite2next Migration Tool         │'));
    console.log(chalk.blue.bold('│         Vite → Next.js Migration        │'));
    console.log(chalk.blue.bold('│                                         │'));
    console.log(chalk.blue.bold('└─────────────────────────────────────────┘'));
    console.log(chalk.gray('Following the official Next.js migration guide'));
    console.log('');
}

export function displayMigrationSteps() {
    console.log('');
    console.log(chalk.blue.bold('The following steps will be performed:'));
    console.log('');

    const steps = [
        'Clean up Vite files',
        'Install Next.js dependencies',
        'Create Next.js configuration file',
        'Update TypeScript configuration (if applicable)',
        'Create root layout file',
        'Create entrypoint page',
        'Update static image imports',
        'Migrate environment variables',
        'Update package.json scripts',
        'Setup React Router compatibility (if applicable)',
        'Migrate static assets'
    ];

    steps.forEach((step, index) => {
        console.log(chalk.gray(`  ${index + 1}.`) + ` ${step}`);
    });

    console.log('');

    return steps.length;
}

export function displayNextSteps(projectSetup = {}) {
    console.log('');
    console.log(chalk.blue.bold('Next steps:'));
    console.log('');

    const steps = [
        'Run "npm run dev" to start your Next.js application',
        'Check the created docs/ directory for migration guides',
    ];

    // Add project-specific steps
    if (projectSetup.usesReactRouter) {
        steps.push('Consider migrating from React Router to Next.js App Router');
    }

    steps.push('Optimize images with the Next.js <Image> component');

    if (projectSetup.cssFramework === 'tailwind') {
        steps.push('Configure your Tailwind theme in tailwind.config.js');
    } else if (projectSetup.cssFramework === 'styled-components') {
        steps.push('Use the created styled-components registry for server components');
    } else if (projectSetup.cssFramework === 'emotion') {
        steps.push('Use the emotion cache for server component support');
    } else if (projectSetup.cssFramework === 'mui') {
        steps.push('Configure your Material UI theme in src/lib/mui-theme.ts');
    }

    steps.push(
        'Optimize fonts with next/font',
        'Optimize third-party scripts with the <Script> component',
        'Review your routes and implement App Router features gradually'
    );

    // Add package manager specific command
    if (projectSetup.packageManager) {
        const runCommand = projectSetup.packageManager === 'npm'
            ? 'npm run dev'
            : projectSetup.packageManager === 'yarn'
                ? 'yarn dev'
                : projectSetup.packageManager === 'bun'
                    ? 'bun run dev'
                    : 'pnpm dev';

        steps[0] = `Run "${runCommand}" to start your Next.js application`;
    }

    steps.forEach((step, index) => {
        console.log(chalk.gray(`  ${index + 1}.`) + ` ${step}`);
    });

    console.log('');
}

export function displayCompletionMessage(startTime) {
    const endTime = Date.now();
    const elapsedTime = ((endTime - startTime) / 1000).toFixed(1);

    console.log('');
    console.log(chalk.green.bold('┌─────────────────────────────────────────┐'));
    console.log(chalk.green.bold('│                                         │'));
    console.log(chalk.green.bold('│        Migration Completed! 🎉          │'));
    console.log(chalk.green.bold('│                                         │'));
    console.log(chalk.green.bold('└─────────────────────────────────────────┘'));
    console.log(chalk.gray(`Total time: ${elapsedTime} seconds`));
    console.log('');
} 