module.exports = {
  testEnvironment: "jest-environment-jsdom",
  testEnvironmentOptions: { url: "http://localhost:5173/" },
  setupFilesAfterEnv: ["<rootDir>/test/setupTests.js"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(gif|ttf|eot|svg|png|jpe?g)$": "<rootDir>/test/fileMock.js",
  },
};
