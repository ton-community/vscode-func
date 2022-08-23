export const config: {
    symbolDiscovery: 'everything' | 'only #include',
    autocompleteAddParentheses: boolean
} = {
    symbolDiscovery: process.env.FUNC_SYMBOL_DISCOVERY as any,
    autocompleteAddParentheses: process.env.FUNC_AUTOCOMPLETE_ADD_PARENTHESES === 'true',
}


export function mutateConfig(next: any) {
    config.symbolDiscovery = next.symbolDiscovery;
    config.autocompleteAddParentheses = next.autocompleteAddParentheses;
}