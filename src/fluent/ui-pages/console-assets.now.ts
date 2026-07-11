import '@servicenow/sdk/global'
import { UiPage } from '@servicenow/sdk/core'
import consolePage from '../../client/index.html'

// ASSET CARRIER — not a user-facing page; nothing links to it.
//
// The real console page (weekend-change-console.now.ts) hand-maintains its html
// as an inline literal, and the SDK only builds + installs the BYOUI bundles
// (/uxasset/externals/x_912401_weekend_c/main.jsdbx + vendor chunks) for a
// UiPage whose html comes from an imported .html file (ui-page-plugin only
// attaches source artifacts when the @fluent-import-html prefix is present).
// This page exists solely to keep that asset pipeline alive.
//
// Side benefit: it serves the SDK-managed rendering of the same app (full
// sdk:now-ux-globals expansion, bootstrap14 included) — a live reference to
// diff against if the hand-maintained console page ever misbehaves.
UiPage({
    $id: Now.ID['console-assets-page'],
    endpoint: 'x_912401_weekend_c_console_assets.do',
    description:
        'Build-asset carrier for the Weekend Change Console. Keeps the BYOUI uxasset bundles installing while the console page HTML is hand-maintained. Do not link to this page.',
    category: 'general',
    html: consolePage,
    direct: true,
})
