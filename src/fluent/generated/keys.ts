import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    bom_json: {
                        table: 'sys_module'
                        id: '05d0f0987a3844f4836d063ae4b93974'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: '3163c485bfc64b8c83ab3e16ab20cd5c'
                    }
                    'styles/tailwind.generated.css': {
                        table: 'sys_ux_theme_asset'
                        id: '54c9e1a917a14a5282961b632e7485b3'
                    }
                    weekend_change_menu: {
                        table: 'sys_app_application'
                        id: 'fa73d74f385347deb71c105abfbcd3ca'
                    }
                    weekend_change_module_console: {
                        table: 'sys_app_module'
                        id: 'fc188ad8cd3e403e8069a11e7cc639cd'
                    }
                }
                composite: [
                    {
                        table: 'sys_ux_lib_asset'
                        id: '05bb9de6e0c047499bcebda2f04e720e'
                        key: {
                            name: 'x_912401_weekend_c/vendor-react-dom--77337c5b.js.map'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '15c4081b3568418ebb1514b1b6084ef6'
                        key: {
                            name: 'x_912401_weekend_c/vendor-lucide-react--ce4a5210'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '3f3843d8300d425b916d250c69f68ca1'
                        key: {
                            application_file: 'c771712812034c30ad92a6b8acdbf2ca'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '536dc433357f46b0b63dee7197bf5773'
                        key: {
                            application_file: 'c0ca57788121443eb947fa710342905a'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '5411bcae56bb4df384e5a7d493ac191d'
                        key: {
                            name: 'x_912401_weekend_c/vendor-react-dom--77337c5b'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '58b44da626bc4f24a085014b614e6067'
                        key: {
                            name: 'x_912401_weekend_c/vendor-lucide-react--ce4a5210.js.map'
                        }
                    },
                    {
                        table: 'sys_ui_page'
                        id: '5bace60f31aa496db12607283954cad0'
                        key: {
                            endpoint: 'x_912401_weekend_c_console.do'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '61b249de6170437dab2d2d57c4697b66'
                        key: {
                            application_file: '15c4081b3568418ebb1514b1b6084ef6'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '61f57843cc43480ea4e95be4470e077b'
                        key: {
                            application_file: '58b44da626bc4f24a085014b614e6067'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '7ac6bf971be441e68c786f3135b3b10d'
                        key: {
                            application_file: '05bb9de6e0c047499bcebda2f04e720e'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact'
                        id: '9553770fa5fb4cdf813c2651df9b5c60'
                        key: {
                            name: 'x_912401_weekend_c_console.do - BYOUI Files'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: 'c070c0719a464db080f129956d637499'
                        key: {
                            application_file: '5411bcae56bb4df384e5a7d493ac191d'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: 'c0ca57788121443eb947fa710342905a'
                        key: {
                            name: 'x_912401_weekend_c/main'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: 'c771712812034c30ad92a6b8acdbf2ca'
                        key: {
                            name: 'x_912401_weekend_c/main.js.map'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: 'cae36288e33e461aaeb45ff8e79f6e2b'
                        key: {
                            application_file: '5bace60f31aa496db12607283954cad0'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                ]
            }
        }
    }
}
