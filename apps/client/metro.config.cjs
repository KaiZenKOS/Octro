const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
const monorepoRoot = path.resolve(__dirname, '../..');

config.watchFolders = [
  monorepoRoot,
  path.resolve(__dirname, '../../docs/v2.2')
];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
