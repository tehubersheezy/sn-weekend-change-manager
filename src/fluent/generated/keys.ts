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
                        id: '0008999bd1d047eda773941597471c86'
                        key: {
                            name: 'x_912401_weekend_c/vendor-lucide-react--1a460167'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '05bb9de6e0c047499bcebda2f04e720e'
                        deleted: true
                        key: {
                            name: 'x_912401_weekend_c/vendor-react-dom--77337c5b.js.map'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '0923a5f9db91478d9e14c521be7a3e3e'
                        deleted: true
                        key: {
                            application_file: '528957667a0544a3952867fb7abd1366'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '0f0e967e7a684909b3f534a4986c4944'
                        key: {
                            application_file: 'e390b1b58608454dab3ba9fda8d47576'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
                        }
                    },
                    {
                        table: 'sys_ui_page'
                        id: '147f5504a2a74352a96d3e3b0225243a'
                        key: {
                            endpoint: 'x_912401_weekend_c_console_assets.do'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '15c4081b3568418ebb1514b1b6084ef6'
                        deleted: true
                        key: {
                            name: 'x_912401_weekend_c/vendor-lucide-react--ce4a5210'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '19f3e294ae2c44ec9e0918800b90df50'
                        deleted: true
                        key: {
                            application_file: 'aed0edf8606d42cfb0c580b93bb6a873'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '293b582c3b624232b9a530a0ea946030'
                        key: {
                            application_file: 'c0ca57788121443eb947fa710342905a'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '2bb0a927550446459f65a8f87050c401'
                        deleted: true
                        key: {
                            application_file: '75d1676e00f4443d9b469d03b9031964'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '3f3843d8300d425b916d250c69f68ca1'
                        deleted: true
                        key: {
                            application_file: 'c771712812034c30ad92a6b8acdbf2ca'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '4350e39698564708828ef5126a85eafe'
                        key: {
                            application_file: '0008999bd1d047eda773941597471c86'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '528957667a0544a3952867fb7abd1366'
                        deleted: true
                        key: {
                            name: 'x_912401_weekend_c/vendor-lucide-react--0013f0ee.js.map'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '536dc433357f46b0b63dee7197bf5773'
                        deleted: true
                        key: {
                            application_file: 'c0ca57788121443eb947fa710342905a'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '5411bcae56bb4df384e5a7d493ac191d'
                        deleted: true
                        key: {
                            name: 'x_912401_weekend_c/vendor-react-dom--77337c5b'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '58b44da626bc4f24a085014b614e6067'
                        deleted: true
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
                        id: '5d66ad3df78c4da0aa479b32f835d1e0'
                        deleted: true
                        key: {
                            application_file: 'aed0edf8606d42cfb0c580b93bb6a873'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '61b249de6170437dab2d2d57c4697b66'
                        deleted: true
                        key: {
                            application_file: '15c4081b3568418ebb1514b1b6084ef6'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '61f57843cc43480ea4e95be4470e077b'
                        deleted: true
                        key: {
                            application_file: '58b44da626bc4f24a085014b614e6067'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '6607aa016f2840dbaca4453caa844f81'
                        key: {
                            name: 'x_912401_weekend_c/vendor-lucide-react--1a460167.js.map'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '6901df6567a849148adedfda71147dad'
                        deleted: true
                        key: {
                            application_file: 'e390b1b58608454dab3ba9fda8d47576'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '6c429e8108fc43258f9c375ccef779c2'
                        deleted: true
                        key: {
                            application_file: '528957667a0544a3952867fb7abd1366'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '755a0abf47d0474f92955c8014e07fb5'
                        key: {
                            application_file: 'c771712812034c30ad92a6b8acdbf2ca'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '75d1676e00f4443d9b469d03b9031964'
                        key: {
                            name: 'x_912401_weekend_c/vendor-react-dom--38182f1b'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '7ac6bf971be441e68c786f3135b3b10d'
                        deleted: true
                        key: {
                            application_file: '05bb9de6e0c047499bcebda2f04e720e'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '8349e5351f2b4617aa73b40ff3880f32'
                        key: {
                            application_file: '147f5504a2a74352a96d3e3b0225243a'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '882f2b4b91554caba2a2c9c9d9e149b9'
                        key: {
                            application_file: '75d1676e00f4443d9b469d03b9031964'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact'
                        id: '9553770fa5fb4cdf813c2651df9b5c60'
                        deleted: true
                        key: {
                            name: 'x_912401_weekend_c_console.do - BYOUI Files'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: 'aed0edf8606d42cfb0c580b93bb6a873'
                        deleted: true
                        key: {
                            name: 'x_912401_weekend_c/vendor-lucide-react--0013f0ee'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact'
                        id: 'bc060fadf8e54293a39439ed0da26f47'
                        key: {
                            name: 'x_912401_weekend_c_console_assets.do - BYOUI Files'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: 'c070c0719a464db080f129956d637499'
                        deleted: true
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
                        deleted: true
                        key: {
                            application_file: '5bace60f31aa496db12607283954cad0'
                            source_artifact: '9553770fa5fb4cdf813c2651df9b5c60'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: 'e390b1b58608454dab3ba9fda8d47576'
                        key: {
                            name: 'x_912401_weekend_c/vendor-react-dom--38182f1b.js.map'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: 'f803a43bbf6549198a8e0956a9719fea'
                        key: {
                            application_file: '6607aa016f2840dbaca4453caa844f81'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
                        }
                    },
                ]
            }
        }
    }
}
