import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    'activity-rest-api': {
                        table: 'sys_ws_definition'
                        id: '4115caf0c59f490bb0d4d5744efe5f83'
                    }
                    'activity-rest-events': {
                        table: 'sys_ws_operation'
                        id: '6352bb2c852d492887f8f439de33353f'
                    }
                    'activity-rest-events-from': {
                        table: 'sys_ws_query_parameter'
                        id: '2293c53185954fc8a1013b1c7f20fa01'
                    }
                    'activity-rest-events-to': {
                        table: 'sys_ws_query_parameter'
                        id: '49f6ab63f56e4fb29ef02e6c06e024dc'
                    }
                    bom_json: {
                        table: 'sys_module'
                        id: '05d0f0987a3844f4836d063ae4b93974'
                    }
                    'jira-base-url-property': {
                        table: 'sys_properties'
                        id: '3d95dcb2ee0144f2853467c014562879'
                        deleted: true
                    }
                    'jira-rest-api': {
                        table: 'sys_ws_definition'
                        id: '5846f7b522eb4dd29dc7752439f191d1'
                    }
                    'jira-rest-issue': {
                        table: 'sys_ws_operation'
                        id: 'f02bd044b0254db18a5a846c65cf8cb2'
                    }
                    'jira-rest-issue-key': {
                        table: 'sys_ws_query_parameter'
                        id: 'a49ab865321643f996af8e5eb4ac0371'
                    }
                    'jira-rest-issues': {
                        table: 'sys_ws_operation'
                        id: 'f5470b55e4804677a55da7ab59991601'
                    }
                    'jira-rest-issues-keys': {
                        table: 'sys_ws_query_parameter'
                        id: 'b0af7975d4934246869810058f8994ba'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: '3163c485bfc64b8c83ab3e16ab20cd5c'
                    }
                    src_server_activity_ts: {
                        table: 'sys_module'
                        id: 'c94e7a70fe084ff3928761ccaa1f07fc'
                    }
                    src_server_jira_ts: {
                        table: 'sys_module'
                        id: 'e765eb54cebf40a2ac1ad5b1cd2ffab2'
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
                    'xscope-read-change-request': {
                        table: 'sys_scope_privilege'
                        id: '271902f26f734773b4f59c06413818e8'
                    }
                    'xscope-read-change-task': {
                        table: 'sys_scope_privilege'
                        id: '0e50271aaf9c4670a959fed5a91b4078'
                    }
                    'xscope-read-sys-audit': {
                        table: 'sys_scope_privilege'
                        id: '98718c38fdb0425fa9a1d3f259689045'
                    }
                    'xscope-read-sys-journal-field': {
                        table: 'sys_scope_privilege'
                        id: 'dfc9dc15a10f44df8e55d5f9624906be'
                    }
                    'xscope-read-sys-user': {
                        table: 'sys_scope_privilege'
                        id: '69ca371ebb79467bbe28bc8d124c5ec7'
                    }
                }
                composite: [
                    {
                        table: 'sys_ux_lib_asset'
                        id: '0008999bd1d047eda773941597471c86'
                        deleted: true
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
                        table: 'sys_ws_query_parameter_map'
                        id: '11a79fb352974bb7ab6ce4c96a17af71'
                        key: {
                            web_service_operation: 'f5470b55e4804677a55da7ab59991601'
                            web_service_query_parameter: 'b0af7975d4934246869810058f8994ba'
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
                        id: '175c5121470f4a58bb586732f5f44fe0'
                        key: {
                            application_file: 'd93008496cfd49c0a41a276362a82c79'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
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
                        id: '3ea3fc385f464d4b9b80b45db7e6b7a1'
                        deleted: true
                        key: {
                            application_file: '9fb74bd7ae4f446fa0ef840b26c7304f'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
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
                        deleted: true
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
                        deleted: true
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
                        id: '83d96c02950042079c2e7f08f223d5f2'
                        key: {
                            application_file: 'f07a2622020f481d8cf3ea0d480f697d'
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
                        id: '978aef1deb944241adec6526ec061b66'
                        deleted: true
                        key: {
                            name: 'x_912401_weekend_c/vendor-lucide-react--b97049ee.js.map'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '99f09e027b334d9290d299d634542a6e'
                        deleted: true
                        key: {
                            name: 'x_912401_weekend_c/vendor-lucide-react--b97049ee'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '9fb74bd7ae4f446fa0ef840b26c7304f'
                        deleted: true
                        key: {
                            name: 'x_912401_weekend_c/vendor-lucide-react--891f9241'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: 'a148b86cf9f547f3b1f77f509f3f9a8d'
                        deleted: true
                        key: {
                            application_file: '978aef1deb944241adec6526ec061b66'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: 'a70af02d896b46948f51f68cd97b0ad1'
                        deleted: true
                        key: {
                            application_file: 'bdb1ff35be314cb5b900df8f9efff9ff'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
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
                        table: 'sys_ws_query_parameter_map'
                        id: 'bc115a31d7434865bb0eb58445795e5b'
                        key: {
                            web_service_operation: '6352bb2c852d492887f8f439de33353f'
                            web_service_query_parameter: '49f6ab63f56e4fb29ef02e6c06e024dc'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: 'bdb1ff35be314cb5b900df8f9efff9ff'
                        deleted: true
                        key: {
                            name: 'x_912401_weekend_c/vendor-lucide-react--891f9241.js.map'
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
                        id: 'c99ee179e6f44bf885d76f5f99b32186'
                        deleted: true
                        key: {
                            application_file: '99f09e027b334d9290d299d634542a6e'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
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
                        id: 'd93008496cfd49c0a41a276362a82c79'
                        key: {
                            name: 'x_912401_weekend_c/vendor-lucide-react--17ea7475'
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
                        table: 'sys_ux_lib_asset'
                        id: 'f07a2622020f481d8cf3ea0d480f697d'
                        key: {
                            name: 'x_912401_weekend_c/vendor-lucide-react--17ea7475.js.map'
                        }
                    },
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: 'f7aa4520e37041c39f6bee90d5c3c6f3'
                        key: {
                            web_service_operation: '6352bb2c852d492887f8f439de33353f'
                            web_service_query_parameter: '2293c53185954fc8a1013b1c7f20fa01'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: 'f803a43bbf6549198a8e0956a9719fea'
                        deleted: true
                        key: {
                            application_file: '6607aa016f2840dbaca4453caa844f81'
                            source_artifact: 'bc060fadf8e54293a39439ed0da26f47'
                        }
                    },
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: 'fb37fe8bb7784a8482200eb493a74c21'
                        key: {
                            web_service_operation: 'f02bd044b0254db18a5a846c65cf8cb2'
                            web_service_query_parameter: 'a49ab865321643f996af8e5eb4ac0371'
                        }
                    },
                ]
            }
        }
    }
}
