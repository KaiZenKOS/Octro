const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Read the official annexes directly; do not create a second fixture copy.
config.watchFolders.push(path.resolve(__dirname, '../../docs/v2.2'));
module.exports = config;
