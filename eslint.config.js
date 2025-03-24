export default [
    {
        "env": {
            "browser": true,
            "es2021": true
        },
        "ignores": ["node_modules/**"],
        "languageOptions": {
            "ecmaVersion": "latest",
            "sourceType": "module"
        },
        "rules": {
            "no-unused-vars": "warn",
            "no-console": "off"
        }
    }
];