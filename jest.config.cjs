module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@tabletop-playground/api$": "ttpg-mock",
  },
};
