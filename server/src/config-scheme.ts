// this file is shared between a client and a server, don't import anything
// it's a typed description of package.json, "configuration" > "properties"

// package.json, func.languageLevel "enum"
export type FuncLanguageLevel =
    | 'v0.4.x'
    | 'v0.5.x'

// package.json, configuration properties keys
export interface FuncPluginConfigScheme {
    symbolDiscovery: 'everything' | 'only #include',
    autocompleteAddParentheses: boolean,
    experimentalDiagnostics: boolean,
    languageLevel: FuncLanguageLevel,
}

// package.json, configuration properties default values
export const defaultConfig: FuncPluginConfigScheme = {
    symbolDiscovery: 'only #include',
    autocompleteAddParentheses: true,
    experimentalDiagnostics: false,
    languageLevel: 'v0.4.x',
}
