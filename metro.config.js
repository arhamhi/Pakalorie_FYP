const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

const escapePath = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ignoredProjectDirs = [
  'backend',
  'ml',
  'dist',
  '.expo',
  '.tmp',
  '.pytest_cache',
  '.ruff_cache',
  '.mypy_cache',
  '.uv-cache',
].map((dir) => new RegExp(`${escapePath(path.join(__dirname, dir))}[/\\\\].*`));

config.resolver.blockList = ignoredProjectDirs;

module.exports = withNativeWind(config, { input: './src/styles/global.css' });
