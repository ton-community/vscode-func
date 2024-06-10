import { FuncLanguageLevel } from '../config-scheme';

// All syntax changes in FunC language are reflected in this object.
// It's used to detect FuncLanguageCapabilities by languageLevel and for error messages.
// The user selects current languageLevel in VS Code Extension settings, it's stored in config.
//
// IMPORTANT! Grammar (tree-sitter-func) always parses the latest version of FunC,
// and when some keywords (or other syntax) is unsupported, they are highlighted as error diagnostics.
export const FuncChangesByLevel = {
    impureByDefault: 'v0.5.0',
    preferGetInsteadOfMethodId: 'v0.5.0',

    traditionalCommentsAllowed: 'v0.5.0',
    pureSpecifierAllowed: 'v0.5.0',
    getSpecifierAllowed: 'v0.5.0',

    deprecatedPragmas: {
        'allow-post-modification': 'v0.5.0',
        'compute-asm-ltr': 'v0.5.0',
    } as any,
}

// concrete capabilities by languageLevel selected by the user in settings
// see detectFuncLanguageCapabilities
export interface FuncLanguageCapabilities {
    impureByDefault: boolean
    preferGetInsteadOfMethodId: boolean

    traditionalCommentsAllowed: boolean
    pureSpecifierAllowed: boolean
    getSpecifierAllowed: boolean

    deprecatedPragmas: string[]
}

function isGreaterOrEqual(languageLevel: FuncLanguageLevel, rhs: string) {
    // "v0.5.x" > "v0.4.x"
    // "v0.5.x" > "v0.5.0"
    // this correctly works until "10" subversion will appear, then I'll complicate it :)
    return languageLevel >= rhs
}

let cachedCapabilities: { [level in string]: FuncLanguageCapabilities } = {}

export function detectFuncLanguageCapabilities(languageLevel: FuncLanguageLevel): FuncLanguageCapabilities {
    if (languageLevel in cachedCapabilities) {
        return cachedCapabilities[languageLevel]
    }

    // for v0.4.x
    let c: FuncLanguageCapabilities = {
        impureByDefault: false,
        preferGetInsteadOfMethodId: false,
        traditionalCommentsAllowed: false,
        pureSpecifierAllowed: false,
        getSpecifierAllowed: false,
        deprecatedPragmas: [],
    }

    if (isGreaterOrEqual(languageLevel, FuncChangesByLevel.impureByDefault)) {
        c.impureByDefault = true
    }
    if (isGreaterOrEqual(languageLevel, FuncChangesByLevel.preferGetInsteadOfMethodId)) {
        c.preferGetInsteadOfMethodId = true
    }
    if (isGreaterOrEqual(languageLevel, FuncChangesByLevel.traditionalCommentsAllowed)) {
        c.traditionalCommentsAllowed = true
    }
    if (isGreaterOrEqual(languageLevel, FuncChangesByLevel.pureSpecifierAllowed)) {
        c.pureSpecifierAllowed = true
    }
    if (isGreaterOrEqual(languageLevel, FuncChangesByLevel.getSpecifierAllowed)) {
        c.getSpecifierAllowed = true
    }

    for (let name in FuncChangesByLevel.deprecatedPragmas) {
        if (isGreaterOrEqual(languageLevel, FuncChangesByLevel.deprecatedPragmas[name])) {
            c.deprecatedPragmas.push(name)
        }
    }

    cachedCapabilities[languageLevel] = c
    return c
}
