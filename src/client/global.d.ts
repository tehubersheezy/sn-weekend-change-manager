// handles importing scss as modules
declare module '*.scss' {
    const content: string
    export default content
}

// ServiceNow injects the user token and Polaris navigation bridge on window.
declare global {
    interface Window {
        g_ck: string
        CustomEvent: typeof CustomEvent & {
            fireTop?: (name: string, detail: unknown) => void
        }
    }
}

export {}
