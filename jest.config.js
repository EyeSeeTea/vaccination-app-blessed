module.exports = {
    setupTestFrameworkScriptFile: "<rootDir>/config/testSetup.js",
    collectCoverageFrom: ["src/**/*.js"],
    testPathIgnorePatterns: ["/node_modules/", "/cypress", "mock"],
    transformIgnorePatterns: [],
    modulePaths: ["src"],
    moduleNameMapper: {
        "raw-loader!": "<rootDir>/config/fileMock.js",
        "\\.(css|scss)$": "<rootDir>/config/styleMock.js",
        "\\.(jpg|jpeg|png|svg)$": "<rootDir>/config/fileMock.js",
    },
    transform: {
        "^.+\\.jsx?$": "babel-jest",
        "^.+\\.tsx?$": "ts-jest",
    },
    testRegex: "/src/.*(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    testEnvironment: "jsdom",
    globals: {
        window: true,
        document: true,
        navigator: true,
        Element: true,
    },
    snapshotSerializers: ["enzyme-to-json/serializer"],
};
