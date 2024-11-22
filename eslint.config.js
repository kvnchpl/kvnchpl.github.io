export default [
    {
        files: ["**/*.js"], // Lint all JavaScript files in the project
        languageOptions: {
            ecmaVersion: "latest", // Use the latest ECMAScript features
            sourceType: "module",  // If you're using ES Modules (import/export)
        },
        rules: {
            "no-unused-vars": "warn", // Warn for unused variables
            "no-console": "off",      // Allow console logs
            "eqeqeq": "error",        // Enforce strict equality (=== and !==)
        },
    },
];
