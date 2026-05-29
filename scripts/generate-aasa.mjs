#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const values = {};
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const localEnv = parseEnvFile(join(rootDir, '.env'));

const teamId = process.env.APPLE_TEAM_ID?.trim() || localEnv.APPLE_TEAM_ID?.trim();
const bundleId =
  process.env.IOS_BUNDLE_IDENTIFIER?.trim() ||
  localEnv.IOS_BUNDLE_IDENTIFIER?.trim() ||
  'com.seagullsplit.app';

if (!teamId) {
  console.error(
    'generate-aasa: APPLE_TEAM_ID is required. Set it in GitHub Actions secrets or your shell before web:build.',
  );
  process.exit(1);
}

const appId = `${teamId}.${bundleId}`;

const aasa = {
  applinks: {
    apps: [],
    details: [
      {
        appIDs: [appId],
        components: [
          {
            '/': '/reset-password*',
            comment: 'Open password reset links in the app',
          },
          {
            '/': '/register*',
            comment: 'Open invitation links in the app',
          },
        ],
      },
    ],
  },
};

const json = `${JSON.stringify(aasa, null, 2)}\n`;
const wellKnownDir = join(rootDir, 'public', '.well-known');
const wellKnownPath = join(wellKnownDir, 'apple-app-site-association');
const rootPath = join(rootDir, 'public', 'apple-app-site-association');

mkdirSync(wellKnownDir, { recursive: true });
writeFileSync(wellKnownPath, json, 'utf8');
writeFileSync(rootPath, json, 'utf8');

console.log(`generate-aasa: wrote ${wellKnownPath}`);
console.log(`generate-aasa: wrote ${rootPath}`);
console.log(`generate-aasa: appIDs=${appId}`);
