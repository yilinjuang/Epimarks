module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "webextensions": true
    },
    // "extends": "eslint:recommended",
    'extends': ['eslint:recommended', 'google'],  // Use Google coding styles.
    "parserOptions": {
        "ecmaVersion": 2017,
        "sourceType": "module"
    },
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        'no-console': 'off',
        'require-jsdoc': 'off',
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
};
