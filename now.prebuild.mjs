import { servicenowFrontEndPlugins, rollup, glob } from '@servicenow/isomorphic-rollup'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

/**
 * Prebuild script for building the client assets of the application before running the rest of the build.
 * Export an async function that accepts useful modules for building the application as arguments.
 * This function returns a Promise that resolves when the build is complete.
 * You can also export an array of functions if you want to run multiple prebuild steps.
 */
export default async ({ rootDir, config, fs, path, logger, registerExplicitId }) => {
    // This is where all the client source files are located
    const clientDir = path.join(rootDir, config.clientDir)
    // Check to make sure we have something to build before we start
    const htmlFilePattern = path.join(clientDir, '**', '*.html')
    const htmlFiles = await glob(htmlFilePattern, { fs })
    if (!htmlFiles.length) {
        logger.warn(`No HTML files found in ${clientDir}, skipping UI build.`)
        return
    }

    // Generate the stylesheet HERE, as a step of the build, rather than in a sibling
    // npm script. Rollup treats tailwind.generated.css as an input to bundle, so a
    // build that does not regenerate it first ships whatever a previous run left on
    // disk — and the file is gitignored, so on a fresh clone that is nothing at all.
    // That is how dev421992 came to serve current JS against a stylesheet built before
    // the AI-report work: the classes the new bundle asked for (max-w-3xl,
    // animate-thinking-sweep) simply had no rules, and a dialog with no max-width goes
    // full-bleed. Running Tailwind from inside the build makes every entry point --
    // `now-sdk build`, `npm run build`, CI, another machine -- bundle CSS generated
    // from the same source tree it is bundling. Failing loudly beats shipping skew.
    const tailwindBin = path.join(rootDir, 'node_modules', '.bin', 'tailwindcss')
    if (!existsSync(tailwindBin)) {
        throw new Error(`Tailwind CLI not found at ${tailwindBin} — run \`npm install\` before building.`)
    }
    const themeCss = path.join(clientDir, 'styles', 'theme.css')
    const generatedCss = path.join(clientDir, 'styles', 'tailwind.generated.css')
    logger.info('Generating stylesheet from theme.css ...')
    execFileSync(tailwindBin, ['-i', themeCss, '-o', generatedCss, '--minify'], {
        cwd: rootDir,
        stdio: 'inherit',
    })

    // This is the destination for the build output
    const staticContentDir = path.join(rootDir, config.staticContentDir)
    // Clean up any previous build output
    fs.rmSync(staticContentDir, { recursive: true, force: true })

    // Call the rollup build
    const rollupBundle = await rollup({
        // Use the file system module provided by the build environment
        fs,
        // Search all HTML files in the client directory to find entry points
        input: htmlFilePattern,
        // Use the default set of ServiceNow plugins for Rollup
        // configured for the scope name and root directory
        plugins: [
            servicenowFrontEndPlugins({
                scope: config.scope,
                rootDir: clientDir,
                projectRootDir: rootDir,
                registerExplicitId,
                // When true -- Pages built with NowSDK will be editable on instance and through Build Agent
                //
                //   Set editableSourceCodeOnInstance to the value below to override
                //   which files are included when deployed to a ServiceNow instance
                //   editableSourceCodeOnInstance: {
                //       excludePatterns: [
                //         '**/node_modules/**',
                //         '**/dist/**',
                //         '**/build/**',
                //         '**/.now/**',
                //         '**/.git/**',
                //         '**/*.min.js',
                //         '**/*.bundle.js',
                //     ],
                //   },
                editableSourceCodeOnInstance: true,
            }),
        ],
    })
    // Write the build output to the configured destination
    // including source maps for JavaScript files
    const rollupOutput = await rollupBundle.write({
        dir: staticContentDir,
        sourcemap: true,
    })
    // Print the build results
    rollupOutput.output.forEach((file) => {
        if (file.type === 'asset') {
            logger.info(`Bundled asset: ${file.fileName} (${file.source.length} bytes)`)
        } else if (file.type === 'chunk') {
            logger.info(`Bundled chunk: ${file.fileName} (${file.code.length} bytes)`)
        }
    })
}
