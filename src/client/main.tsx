import './styles/tailwind.generated.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app'

/**
 * On the instance, the css import above becomes a runtime-injected
 * /uxta/...assetx stylesheet link that loads asynchronously — React would
 * otherwise paint before it applies (unstyled flash: body margin 8px,
 * content-box, no padding). Gate the mount on our own design tokens being
 * computable; --background comes from theme.css, so any delivery mechanism
 * (assetx link on-instance, dev server locally) satisfies the probe the
 * moment the sheet is active. 3s deadline so a failed stylesheet still
 * renders the app rather than a blank page.
 */
/**
 * The css import above makes the bundler inject its own <link> to the assetx
 * URL — WITHOUT a version param, and the instance serves .assetx with a 1-year
 * Expires, so clients pin whatever body they first fetched (this shipped a
 * stale sheet with no max-lg:/#root rules for a full day). The UI page head
 * loads the same file with ?uxpcb=<install timestamp>; that copy is
 * authoritative. Remove any unversioned injected duplicates — repeatedly,
 * inside the readiness poll, in case the injection lands late.
 */
function dropUnversionedAppCss() {
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
    // Prune only when the authoritative ?uxpcb= copy is present (always true on
    // the instance). The dev server has no uxpcb copy — its bundler-injected
    // &v=-stamped link is the ONLY stylesheet, and removing it would leave the
    // page permanently unstyled.
    const hasVersioned = links.some(
        (l) => l.href.includes('tailwind.generated.css') && l.href.includes('uxpcb='),
    )
    if (!hasVersioned) return
    for (const link of links) {
        if (link.href.includes('.assetx') && link.href.includes('tailwind.generated.css') && !link.href.includes('uxpcb=')) {
            link.remove()
        }
    }
}

function stylesReady(deadlineMs = 3000): Promise<void> {
    const started = performance.now()
    return new Promise((resolve) => {
        const tick = () => {
            dropUnversionedAppCss()
            const tokens = getComputedStyle(document.documentElement).getPropertyValue('--background')
            if (tokens.trim() !== '' || performance.now() - started > deadlineMs) resolve()
            else requestAnimationFrame(tick)
        }
        tick()
    })
}

// The dev server re-serializes index.html with a self-closing <script/>; the
// HTML parser treats that as an unclosed tag and swallows the rest of the
// document — including <div id="root"> — as script text. Recreate the
// container when it's missing. On the instance #root always exists in the
// served page, so this branch never runs there.
let rootElement = document.getElementById('root')
if (!rootElement) {
    rootElement = document.createElement('div')
    rootElement.id = 'root'
    document.body.appendChild(rootElement)
}
stylesReady().then(() => {
    setTimeout(dropUnversionedAppCss, 1500) // catch a late-injected duplicate
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    )
})
