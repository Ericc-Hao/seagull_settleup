import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SERVICE_FILES = [
  'expenseService.ts',
  'groupService.ts',
  'settlementService.ts',
  'invitationService.ts',
  'memberService.ts',
  'profileService.ts',
  'receiptService.ts',
  'categoryService.ts',
  'teamService.ts',
];

const FORBIDDEN_PATTERNS = [/refreshCache\s*\(/, /setCache\s*\(/, /cacheEvents/, /\binvalidate\s*\(/];

describe('service cache isolation', () => {
  for (const fileName of SERVICE_FILES) {
    it(`${fileName} does not call refreshCache, setCache, cacheEvents, or invalidate`, () => {
      const source = readFileSync(join(process.cwd(), 'src/services', fileName), 'utf8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(source).not.toMatch(pattern);
      }
    });
  }
});
