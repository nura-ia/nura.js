import type { AuditLogger } from './types.js';

export class ConsoleAuditLogger implements AuditLogger {
  info(ev: object): void {
    console.info('[intent]', ev);
  }

  warn(ev: object): void {
    console.warn('[intent]', ev);
  }

  error(ev: object): void {
    console.error('[intent]', ev);
  }
}
