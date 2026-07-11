import '@servicenow/sdk/global'
import { UiPage } from '@servicenow/sdk/core'

// TAKE-CONTROL HTML — hand-maintained, NOT regenerated from src/client/index.html.
//
// This is the expansion of the sdk:now-ux-globals tag (from
// @servicenow/sdk-build-plugins ui-page-plugin nowUxGlobals(), captured off the
// live record 2026-07-10) with two deliberate changes:
//
//   1. window.self.loaded is set true immediately after functions_bootstrap14.js.
//      A direct page has none of the classic onload scaffolding that flushes the
//      bootstrap14 render/load queues (and the flushers need jQuery, which this
//      page doesn't load). Without the flag, addTopRenderEvent/addLoadEvent
//      callbacks — notably the g2:client_script user bootstrap that constructs
//      window.g_user (id, name, roles) — would queue forever. With it, bootstrap14's
//      own already-loaded semantics kick in and they run on the next tick, so
//      g_user and GlideAjax are both fully usable.
//   2. The Array.from polyfill is NOT wrapped in CDATA. The SDK's XML round-trip
//      (escapeRawContent -> parse -> rebuild in ui-page-plugin) mangled `//]]>`
//      into `//]]\n>`, which threw "Uncaught SyntaxError: Unexpected token '>'"
//      and killed the whole polyfill script block. Script text survives the
//      round-trip raw (`<`/`&` are placeholder-protected), so CDATA is not needed.
//
// Because `html` is an inline literal (no .html import), the SDK does not attach
// BYOUI source artifacts to this page. The uxasset bundles this page loads
// (/uxasset/externals/x_912401_weekend_c/main.jsdbx + vendor chunks) are kept
// installing by console-assets.now.ts, which still imports src/client/index.html.
//
// MAINTENANCE: if src/client/index.html changes (new script/meta/title), mirror
// the change here by hand. The carrier page renders the SDK-managed version of
// the same app — diff against it when this page misbehaves.
const consoleHtml = `<html>
  <head>
    <title>Weekend Change Console</title>
    <!-- Hand-maintained head: sdk:now-ux-globals expansion + window.self.loaded shim. See weekend-change-console.now.ts -->
    <script>window.NOW = {};
window.NOW.user = {};
window.NOW.batch_glide_ajax_requests = false;
window.NOW.isUsingPolaris = true;
window.NOW.exclude_dark_theme = "false";
window.g_ck = "$[gs.getSession().getSessionToken() || gs.getSessionToken()]";</script>
    <g:requires name="scripts/doctype/functions_bootstrap14.js"></g:requires>
    <!-- Direct page: no classic onload scaffolding ever flushes bootstrap14's queues,
         so declare the page "born loaded" — add*Event callbacks then run on the next
         tick, which is what lets the g2 user bootstrap below construct window.g_user. -->
    <script>window.self.loaded = true;</script>
    <g:requires name="scripts/lib/prototype.js"></g:requires>
    <g:requires name="scripts/classes/ajax/GlideURL.js"></g:requires>
    <g:requires name="scripts/doctype/CustomEventManager.js"></g:requires>
    <g:requires name="scripts/classes/ajax/GlideAjax.js"></g:requires>
    <g:requires name="scripts/classes/GlideUser.js"></g:requires>
    <g2:client_script type="user"></g2:client_script>
    <link rel="preload" href="/uxasset/set-cache-buster/$[UxFrameworkScriptables.getFlushTimestamp()].js" as="script"></link>
    <g:requires name="scripts/polaris_theme_refresh_observer.js"></g:requires>
    <link data-source-id="glide-theme" id="polarisberg_theme_variables" rel="stylesheet" href="/$uxappimmutables.do?sysparm_request_type=ux_theme$[AMP]sysparm_app_sys_id=c86a62e2c7022010099a308dc7c26022$[AMP]uxpcb=$[sn_ui.PolarisUI.getThemeVariableCssCacheKey()]"></link>
    <!-- App css, load-blocking and WITH the per-install cache-buster. The bundler's own
         runtime-injected link for this same file has no version param, and the instance
         serves .assetx with a 1-year Expires — clients pin whatever body they first saw.
         main.tsx removes that unversioned injected link; this one is authoritative. -->
    <link rel="stylesheet" href="/uxta/54c9e1a917a14a5282961b632e7485b3.assetx?path=styles/tailwind.generated.css$[AMP]uxpcb=$[UxFrameworkScriptables.getFlushTimestamp()]"></link>
    <script type="module" src="/uxasset/externals/@devsnc/library-uxf/index.jsdbx"></script>
    <!-- Array.from polyfill to fix prototype.js breaking iterables (Set, Map, etc.) -->
    <!-- MUST be inline script BEFORE module scripts - ESM imports are hoisted so external polyfill files won't work -->
    <script type="text/javascript">
    (function () {
      var testWorks = (function () {
        try {
          var result = Array.from(new Set([1, 2]));
          return (
            Array.isArray(result) && result.length === 2 && result[0] === 1
          );
        } catch (e) {
          return false;
        }
      })();
      if (testWorks) return;
      var originalArrayFrom = Array.from;
      function specArrayFrom(arrayLike, mapFn, thisArg) {
        if (arrayLike == null)
          throw new TypeError(
            "Array.from requires an array-like or iterable object"
          );
        var C = this;
        if (typeof C !== "function" || C === Window || C === Object) {
          C = Array;
        }
        var mapping = typeof mapFn === "function";
        var iterFn = arrayLike[Symbol.iterator];
        if (typeof iterFn === "function") {
          var result = [];
          var i = 0;
          var iterator = iterFn.call(arrayLike);
          var step;
          while (!(step = iterator.next()).done) {
            result[i] = mapping
              ? mapFn.call(thisArg, step.value, i)
              : step.value;
            i++;
          }
          result.length = i;
          return result;
        }
        var items = Object(arrayLike);
        var len = Math.min(
          Math.max(Number(items.length) || 0, 0),
          Number.MAX_SAFE_INTEGER
        );
        var result = new C(len);
        for (var k = 0; k < len; k++) {
          result[k] = mapping ? mapFn.call(thisArg, items[k], k) : items[k];
        }
        result.length = len;
        return result;
      }
      Array.from = function (arrayLike, mapFn, thisArg) {
        if (
          arrayLike != null &&
          typeof arrayLike[Symbol.iterator] === "function"
        ) {
          try {
            return specArrayFrom.call(this, arrayLike, mapFn, thisArg);
          } catch (e) {
            console.error("Array.from failed with error:", e);
            return originalArrayFrom.call(this, arrayLike, mapFn, thisArg);
          }
        }
        return originalArrayFrom.call(this, arrayLike, mapFn, thisArg);
      };
    })();

    if (window.Element && Element.Methods) {
      Element.Methods.remove = function (element) {
        element = $(element);
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        return element;
      };
      Element.addMethods();
    }
    </script>
    <script src="/uxasset/externals/x_912401_weekend_c/main.jsdbx?uxpcb=$[UxFrameworkScriptables.getFlushTimestamp()]" type="module"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`

UiPage({
    // Keep the original $id so this stays the same platform record across the rename.
    $id: Now.ID['incident-manager-page'],
    endpoint: 'x_912401_weekend_c_console.do',
    description: 'Weekend Change Console UI Page',
    category: 'general',
    html: consoleHtml,
    direct: true,
})
