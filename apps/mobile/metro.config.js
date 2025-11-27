const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Add pnpm workspace support
config.watchFolders = [
  workspaceRoot,
  path.resolve(workspaceRoot, "node_modules/.pnpm"),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Enable symlink resolution for pnpm
config.resolver.unstable_enableSymlinks = true;

// Ensure Metro can resolve through pnpm's nested structure
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

config.resolver.assetExts.push("lottie");

// Enable require.context for expo-router
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

module.exports = config;

