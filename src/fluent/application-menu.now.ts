import '@servicenow/sdk/global'
import { ApplicationMenu, Record } from '@servicenow/sdk/core'

// Top-level navigator entry for the Weekend Change Console.
const weekendChangeMenu = ApplicationMenu({
    $id: Now.ID['weekend_change_menu'],
    title: 'Weekend Change Console',
    hint: 'Review change requests scheduled in the weekend change window',
    description: 'Weekend Change Console',
    active: true,
})

// Module: direct link to the console UI Page.
Record({
    $id: Now.ID['weekend_change_module_console'],
    table: 'sys_app_module',
    data: {
        title: 'Console',
        application: weekendChangeMenu,
        link_type: 'DIRECT',
        query: 'x_912401_weekend_c_console.do',
        hint: 'Open the Weekend Change Console',
        active: true,
        order: 100,
    },
})
