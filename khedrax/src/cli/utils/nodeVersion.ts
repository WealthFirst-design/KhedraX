export interface NodeVersionCheckResult {
  ok: boolean;
  reason?: string;
}

export function checkNodeVersion(version: string): NodeVersionCheckResult {
  const major = Number.parseInt(version.split('.')[0], 10);
  if (Number.isNaN(major) || major < 18) {
    return { ok: false, reason: 'KhedraX requires Node.js 18 or newer.' };
  }
  return { ok: true };
}
