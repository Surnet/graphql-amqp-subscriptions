#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const { scripts, devDependencies, ...packageJson } = require('../package.json');

packageJson.main = './index.js';
packageJson.types = './index.d.ts';
packageJson.files = ['*'];

fs.writeFileSync('./lib/package.json', JSON.stringify(packageJson, undefined, 2));

const copyFiles = ['README.md', 'LICENSE'];
for (const file of copyFiles) {
    fs.copyFileSync(`./${file}`, `./lib/${file}`);
}
