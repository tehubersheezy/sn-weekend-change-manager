import '@servicenow/sdk/global'
import { UiPage } from '@servicenow/sdk/core'
import consolePage from '../../client/index.html'

UiPage({
    // Keep the original $id so this stays the same platform record across the rename.
    $id: Now.ID['incident-manager-page'],
    endpoint: 'x_912401_weekend_c_console.do',
    description: 'Weekend Change Console UI Page',
    category: 'general',
    html: consolePage,
    direct: true,
})
