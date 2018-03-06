module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "webextensions": true,
    },
    "extends": ["eslint:recommended", "google"],
    "parserOptions": {
        "ecmaVersion": 2017,
        "sourceType": "module",
    },
    "plugins": ["html"],
    "rules": {
        "indent": [
            "error",
            4,
        ],
        "linebreak-style": [
            "error",
            "unix",
        ],
        "no-console": "off",
        "require-jsdoc": "off",
        "quotes": [
            "error",
            "double",
        ],
        "semi": [
            "error",
            "always",
        ],
    },
};
