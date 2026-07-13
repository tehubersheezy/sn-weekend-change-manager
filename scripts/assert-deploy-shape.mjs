import { readdirSync } from 'node:fs'

/**
 * Refuse to install a dist/static that the dev server has been writing into.
 *
 * Both builders target the SAME dist/static, in two different shapes: the deploy
 * build (rollup) emits .jsdbx bundles, the dev server emits plain .js. The dev
 * server watches src/client, and the deploy build regenerates a file inside it
 * (styles/tailwind.generated.css) — so a deploy that runs while the dev server is
 * up wakes its watcher, which rebuilds into the directory the installer is about
 * to upload. `now-sdk install` then finds two files claiming one sys_ux_lib_asset
 * sys_id, reports it as a conflict, and lets "the last entry take precedence" —
 * which can leave the DEV bundle sitting in the record the deployed page loads.
 * It prints a warning and exits 0, so the deploy looks like it worked.
 *
 * A wrong bundle on the instance is not worth the convenience of deploying without
 * looking, so this makes it a hard failure instead.
 */
const dir = 'dist/static'
const strays = readdirSync(dir).filter((f) => f.endsWith('.js') || f.endsWith('.js.map'))

if (strays.length) {
    console.error(
        `\n  Refusing to install: ${dir} holds dev-server artifacts alongside the deploy build.\n\n` +
            strays.map((f) => `      ${f}`).join('\n') +
            `\n\n  The dev server rebuilds into the same directory the installer uploads, so both\n` +
            `  shapes would ship and the last one written would win. Stop the dev server (it\n` +
            `  binds localhost:3000), then run \`npm run deploy\` again.\n`,
    )
    process.exit(1)
}
