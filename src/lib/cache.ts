export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class LruTtlCache<T> {
  private maxSize: number;
  private ttlMs: number;
  private cache = new Map<string, CacheEntry<T>>();

  constructor({ maxSize, ttlMs }: { maxSize: number; ttlMs: number }) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }
}
