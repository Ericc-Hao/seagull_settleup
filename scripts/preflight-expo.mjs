#!/usr/bin/env node
/**
 * Pre-flight checks before Expo native builds / start.
 * Fails fast with actionable errors instead of opaque @expo/cli stack traces.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const errors = [];
const warnings = [];

function readPackageJson() {
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const values = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
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

function checkNodeVersion(pkg) {
  const expected = pkg.engines?.node;
  if (!expected) {
    return;
  }

  const current = process.version;
  const major = Number(current.slice(1).split('.')[0]);
  if (expected.includes('22') && major >= 24) {
    warnings.push(
      `Node ${current} detected; package.json engines specify "${expected}". Expo/EAS builds are safer on Node 22.`,
    );
  }
}

function checkModule(name, resolveFromDir) {
  const requireFrom = createRequire(path.join(resolveFromDir, 'package.json'));
  try {
    requireFrom.resolve(name);
    return true;
  } catch {
    return false;
  }
}

function checkExpoCliDeps() {
  const expoCliDir = path.join(root, 'node_modules/expo/node_modules/@expo/cli');
  if (!fs.existsSync(expoCliDir)) {
    errors.push('Missing node_modules/expo/node_modules/@expo/cli. Run: npm ci');
    return;
  }

  const requiredForCli = ['chalk'];
  for (const dep of requiredForCli) {
    if (!checkModule(dep, expoCliDir)) {
      errors.push(
        `@expo/cli cannot resolve "${dep}" (broken node_modules). Run: rm -rf node_modules && npm ci`,
      );
    }
  }
}

function checkSupabaseVersion(pkg) {
  const version = pkg.dependencies?.['@supabase/supabase-js'];
  if (!version) {
    return;
  }

  const pinned = version.replace(/^[^0-9]*/, '');
  const [major, minor, patch] = pinned.split('.').map(Number);
  const isRnUnsafe = major > 2 || (major === 2 && minor >= 46);
  if (isRnUnsafe) {
    errors.push(
      `@supabase/supabase-js@${pinned} may break Hermes iOS builds (OTEL dynamic import). Pin to 2.45.4 in package.json, then npm ci.`,
    );
  }
}

function checkPublicEnv() {
  const envFile = parseEnvFile(path.join(root, '.env'));
  const required = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

  for (const key of required) {
    const value = process.env[key] ?? envFile[key];
    if (!value?.trim()) {
      warnings.push(`Missing ${key} in environment or .env (native build may fail at runtime).`);
    }
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY || envFile.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push(
      'SUPABASE_SERVICE_ROLE_KEY must not be in .env for the Expo app. Use EAS secrets / Edge Functions only.',
    );
  }
}

function checkNodeModulesExists() {
  if (!fs.existsSync(path.join(root, 'node_modules/expo'))) {
    errors.push('node_modules is missing or incomplete. Run: npm ci');
  }
}

function main() {
  const pkg = readPackageJson();

  checkNodeModulesExists();
  checkNodeVersion(pkg);
  checkExpoCliDeps();
  checkSupabaseVersion(pkg);
  checkPublicEnv();

  if (warnings.length > 0) {
    console.warn('\n[preflight:expo] warnings:');
    for (const warning of warnings) {
      console.warn(`  - ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error('\n[preflight:expo] failed — fix before running Expo:\n');
    for (const error of errors) {
      console.error(`  ✗ ${error}`);
    }
    console.error('');
    process.exit(1);
  }

  console.log('[preflight:expo] ok');
}

main();
