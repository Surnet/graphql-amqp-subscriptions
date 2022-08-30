module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "mocha": true,	
        "node": true
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "plugins": [
        "eslint-plugin-jsdoc",
        "eslint-plugin-no-null",
        "mocha",
        "@typescript-eslint"
    ],
    "root": true,
    "rules": {
        "@typescript-eslint/explicit-function-return-type": [
            "off",
            {
                "allowExpressions": false,
                "allowTypedFunctionExpressions": false,
                "allowHigherOrderFunctions": false,
                "allowDirectConstAssertionInArrowFunctions": true,
                "allowConciseArrowFunctionExpressionsStartingWithVoid": true
            }
        ],
        "@typescript-eslint/explicit-member-accessibility": [
            "error",
            {
                "accessibility": "explicit"
            }
        ],
        "@typescript-eslint/explicit-module-boundary-types": [
            "off",
            {
                "allowArgumentsExplicitlyTypedAsAny": true,
                "allowDirectConstAssertionInArrowFunctions": true,
                "allowHigherOrderFunctions": false,
                "allowTypedFunctionExpressions": false
            }
        ],
        "@typescript-eslint/indent": [
            "off",
            4,
            {
                "CallExpression": {
                    "arguments": "first"
                },
                "FunctionDeclaration": {
                    "parameters": "first"
                },
                "FunctionExpression": {
                    "parameters": "first"
                }
            }
        ],
        "@typescript-eslint/member-delimiter-style": [
            "error",
            {
                "multiline": {
                    "delimiter": "semi",
                    "requireLast": true
                },
                "singleline": {
                    "delimiter": "semi",
                    "requireLast": false
                }
            }
        ],
        "@typescript-eslint/member-ordering": "error",
        "@typescript-eslint/naming-convention": "error",
        "@typescript-eslint/no-empty-function": "error",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-inferrable-types": "off",
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-shadow": [
            "error",
            {
                "hoist": "all"
            }
        ],
        "@typescript-eslint/no-unused-expressions": "error",
        "@typescript-eslint/no-var-requires": "error",
        "@typescript-eslint/prefer-namespace-keyword": "error",
        "@typescript-eslint/quotes": [
            "error",
            "single",
            {
                "avoidEscape": true
            }
        ],
        "@typescript-eslint/semi": [
            "error",
            "always"
        ],
        "@typescript-eslint/type-annotation-spacing": "error",
        "@typescript-eslint/typedef": [
            "off",
            {
                "parameter": true,
                "arrowParameter": true,
                "propertyDeclaration": true,
                "variableDeclaration": true,
                "memberVariableDeclaration": true
            }
        ],
        "brace-style": [
            "error",
            "1tbs"
        ],
        "comma-dangle": "error",
        "curly": "error",
        "default-case": "error",
        "eol-last": "error",
        "eqeqeq": [
            "error",
            "smart"
        ],
        "guard-for-in": "error",
        "id-denylist": [
            "error",
            "any",
            "Number",
            "number",
            "String",
            "string",
            "Boolean",
            "boolean",
            "Undefined",
            "undefined"
        ],
        "id-match": "error",
        "indent": "off",
        "jsdoc/check-alignment": "error",
        "jsdoc/check-indentation": "error",
        "jsdoc/newline-after-description": "error",
        "max-len": [
            "error",
            {
                "code": 140
            }
        ],
        "no-bitwise": "error",
        "no-caller": "error",
        "no-cond-assign": "error",
        "no-console": [
            "error",
            {
                "allow": [
                    "warn",
                    "dir",
                    "timeLog",
                    "assert",
                    "clear",
                    "count",
                    "countReset",
                    "group",
                    "groupEnd",
                    "table",
                    "dirxml",
                    "error",
                    "groupCollapsed",
                    "Console",
                    "profile",
                    "profileEnd",
                    "timeStamp",
                    "context"
                ]
            }
        ],
        "no-debugger": "error",
        "no-empty": "error",
        "no-empty-function": "off",
        "no-eval": "error",
        "no-fallthrough": "error",
        "no-multiple-empty-lines": "off",
        "no-new-wrappers": "error",
        "no-null/no-null": "off",
        "no-redeclare": "error",
        "no-shadow": "off",
        "no-trailing-spaces": "error",
        "no-underscore-dangle": "off",
        "no-unused-expressions": "off",
        "no-unused-labels": "error",
        "no-var": "error",
        "quotes": "off",
        "radix": "error",
        "semi": "off"
    }
};
