type Schema = {
  version: number;
  defaults: Record<string, unknown>;
};

export class ConfigManager {
  private key = 'agp:settings';
  private consentKey = 'agp:consent';

  getConsent(): boolean {
    try {
      return localStorage.getItem(this.consentKey) === 'true';
    } catch {
      return false;
    }
  }
  setConsent(v: boolean) {
    try {
      localStorage.setItem(this.consentKey, String(v));
    } catch {}
  }

  load<T extends Record<string, unknown>>(ns: string, schema: Schema): T {
    const key = `${this.key}:${ns}:${schema.version}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return schema.defaults as T;
      const parsed = JSON.parse(raw) as T;
      return { ...(schema.defaults as T), ...parsed };
    } catch {
      return schema.defaults as T;
    }
  }

  save<T extends Record<string, unknown>>(ns: string, schema: Schema, data: T) {
    const key = `${this.key}:${ns}:${schema.version}`;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  }
}
