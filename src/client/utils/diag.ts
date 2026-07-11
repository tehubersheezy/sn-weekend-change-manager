/**
 * One-shot layout/theme diagnostics. Dumps a copy-pasteable block to the console
 * so we can find (a) why the content below the top nav is shifted left / clipped,
 * and (b) which stylesheet is injecting the platform rules (Bootstrap `.hidden`,
 * global resets/negative margins) that fight our Tailwind layout.
 *
 * Temporary — remove once the layout root cause is fixed.
 */
export function runDiagnostics(tag = 'mount') {
    try {
        const html = document.documentElement
        const body = document.body
        const root = document.getElementById('root')
        const cs = (el: Element) => getComputedStyle(el)
        const px = (el: Element, prop: string) => cs(el).getPropertyValue(prop).trim()

        const box = (label: string, el: Element | null) => {
            if (!el) return `${label.padEnd(16)}: (not found)`
            const r = el.getBoundingClientRect()
            const c = cs(el)
            return (
                `${label.padEnd(16)}: rect L=${Math.round(r.left)} R=${Math.round(r.right)} W=${Math.round(r.width)}` +
                ` | mL=${c.marginLeft} mR=${c.marginRight} pL=${c.paddingLeft}` +
                ` | box=${c.boxSizing} pos=${c.position} tf=${c.transform === 'none' ? 'none' : 'SET'}`
            )
        }

        // Horizontal overflow: if scrollWidth > clientWidth, something is wider than
        // the viewport and the page can scroll right, clipping the left edge.
        const overflow = [
            `html  scrollW=${html.scrollWidth} clientW=${html.clientWidth} scrollLeft=${html.scrollLeft}`,
            `body  scrollW=${body.scrollWidth} clientW=${body.clientWidth}`,
            `#root scrollW=${root?.scrollWidth} clientW=${root?.clientWidth}`,
            `window.scrollX=${window.scrollX} innerW=${window.innerWidth}`,
        ]

        // Stylesheet forensics: find who defines `.hidden`, negative margins, and
        // global box-sizing/margin resets. Cross-origin sheets throw on cssRules —
        // ServiceNow's are same-origin so they read fine.
        const suspects: string[] = []
        for (const sheet of Array.from(document.styleSheets)) {
            let rules: CSSRuleList | null = null
            try {
                rules = sheet.cssRules
            } catch {
                suspects.push(`[BLOCKED cross-origin] ${sheet.href ?? '(inline)'}`)
                continue
            }
            const href = sheet.href ?? '(inline <style>)'
            const short = href.replace(/^https?:\/\/[^/]+/, '').slice(0, 70)
            for (const rule of Array.from(rules)) {
                const txt = (rule as CSSStyleRule).cssText
                if (!txt) continue
                const sel = (rule as CSSStyleRule).selectorText || ''
                const hitHidden = /(^|[\s,>])\.hidden\b/.test(sel)
                const hitNegMargin = /margin[^;:]*:\s*-/.test(txt)
                const hitStarReset = /^\s*\*(,|\s|::?before|::?after|\{)/.test(sel) && /(margin|padding|box-sizing)/.test(txt)
                if (hitHidden || hitNegMargin || hitStarReset) {
                    suspects.push(`${short}  ⟶  ${txt.slice(0, 120)}`)
                }
            }
        }

        // Which font family ACTUALLY renders a live element? Measure the element,
        // then re-measure its text with each family of its stack in isolation —
        // the family whose solo width matches the live width is the renderer.
        // (Missing glyphs/weights fall to a different font and change the width.)
        const whichFontRenders = (sample: Element | null): string => {
            if (!sample) return '(sample not found)'
            const c = cs(sample)
            const probe = document.createElement('span')
            probe.textContent = sample.textContent || '9:39 AM'
            probe.style.cssText =
                `position:absolute;visibility:hidden;white-space:pre;` +
                `font-size:${c.fontSize};font-weight:${c.fontWeight};` +
                `letter-spacing:${c.letterSpacing};text-transform:${c.textTransform};` +
                `font-variant-numeric:${c.fontVariantNumeric};`
            document.body.appendChild(probe)
            const target = sample.getBoundingClientRect().width
            let hit = `(no stack family matches ${Math.round(target)}px)`
            for (const raw of c.fontFamily.split(',')) {
                const fam = raw.trim().replace(/^["']|["']$/g, '')
                probe.style.fontFamily = `"${fam}"`
                if (Math.abs(probe.getBoundingClientRect().width - target) < 0.6) {
                    hit = fam
                    break
                }
            }
            probe.remove()
            return hit
        }
        const fontAvail = ['StyreneB', 'Inter', 'Tiempos Headline', 'Cormorant Garamond', 'JetBrains Mono']
            .map((f) => `${f}=${document.fonts.check(`16px "${f}"`) ? 'YES' : 'no'}`)
            .join('  ')
        const clockLabel = document.querySelector('[data-diag="clocks"] > span > span:nth-child(1)')
        const clockTime = document.querySelector('[data-diag="clocks"] > span > span:nth-child(2)')

        const lines = [
            `===== WCM-DIAG (${tag}) =====`,
            `innerWidth=${window.innerWidth} htmlFont=${px(html, 'font-size')} bodyFont=${px(body, 'font-size')}`,
            `-- fonts --`,
            `installed locally   : ${fontAvail}`,
            `clock LABEL renders : ${whichFontRenders(clockLabel)}`,
            `clock TIME renders  : ${whichFontRenders(clockTime)}`,
            `h1 headline renders : ${whichFontRenders(document.querySelector('h1'))}`,
            `-- overflow --`,
            ...overflow,
            `-- element boxes --`,
            box('#root', root),
            box('app-root', root?.firstElementChild ?? null),
            box('content-header', document.querySelector('[data-diag="content-header"]')),
            box('main', document.querySelector('[data-diag="main"]')),
            box('clocks', document.querySelector('[data-diag="clocks"]')),
            `body margin=${cs(body).margin} padding=${cs(body).padding} box=${cs(body).boxSizing}`,
            `html box-sizing=${cs(html).boxSizing}`,
            `-- stylesheet suspects (.hidden / neg-margin / * reset) --`,
            ...(suspects.length ? suspects.slice(0, 25) : ['(none found in readable sheets)']),
            `===== END WCM-DIAG =====`,
        ]
        console.log(lines.join('\n'))
    } catch (e) {
        console.log('[WCM-DIAG] failed:', e)
    }
}
