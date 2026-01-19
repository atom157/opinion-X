import { NextResponse } from 'next/server';
import { LruTtlCache } from '@/lib/cache';
import { opinionFetch } from '@/lib/opinionApi';
import { normalizeMarket, RawMarket } from '@/lib/normalize';

const cache = new LruTtlCache({ maxSize: 200, ttlMs: 30_000 });
const MAX_SCAN_PAGES = 8;

const extractMarkets = (payload: unknown): RawMarket[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as RawMarket[];
  if (typeof payload !== 'object') return [];
  const typed = payload as Record<string, unknown>;
  if (Array.isArray(typed.items)) return typed.items as RawMarket[];
  if (Array.isArray(typed.list)) return typed.list as RawMarket[];
  if (Array.isArray(typed.markets)) return typed.markets as RawMarket[];
  if (Array.isArray(typed.data)) return typed.data as RawMarket[];
  if (typed.data && typeof typed.data === 'object') {
    const nested = typed.data as Record<string, unknown>;
    if (Array.isArray(nested.items)) return nested.items as RawMarket[];
    if (Array.isArray(nested.list)) return nested.list as RawMarket[];
    if (Array.isArray(nested.markets)) return nested.markets as RawMarket[];
  }
  if (typed.result && typeof typed.result === 'object') {
    const nested = typed.result as Record<string, unknown>;
    if (Array.isArray(nested.list)) return nested.list as RawMarket[];
  }
  return [];
};

const extractTotal = (payload: unknown): number | null => {
  if (!payload || typeof payload !== 'object') return null;
  const typed = payload as Record<string, unknown>;
  const candidates = [
    typed.total,
    typed.count,
    typed.totalCount,
    typed.total_count,
    typed?.result && typeof typed.result === 'object' ? (typed.result as Record<string, unknown>).total : null
  ];
  for (const value of candidates) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') return Number(value);
  }
  return null;
};

const matchesFilter = (
  market: ReturnType<typeof normalizeMarket>,
  filters: { q?: string; status?: string; chainId?: string; quoteToken?: string }
) => {
  const { q, status, chainId, quoteToken } = filters;
  if (q && !market.title.toLowerCase().includes(q.toLowerCase())) return false;
  if (status && (!market.status || market.status.toLowerCase() !== status.toLowerCase())) return false;
  if (chainId && (market.chainId === null || String(market.chainId) !== String(chainId))) {
    return false;
  }
  if (quoteToken && (!market.quoteToken || market.quoteToken.toLowerCase() !== quoteToken.toLowerCase())) {
    return false;
  }
  return true;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limitParam = searchParams.get('limit');
  const requestedPageSize = Number(limitParam ?? searchParams.get('pageSize') ?? '20');
  const pageSize = Math.min(Math.max(requestedPageSize, 1), 50);
  const q = searchParams.get('q') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const chainId = searchParams.get('chainId') ?? undefined;
  const quoteToken = searchParams.get('quoteToken') ?? undefined;
  const sort = searchParams.get('sort') ?? undefined;

  const cacheKey = JSON.stringify({ page, pageSize, q, status, chainId, quoteToken, sort });
  const cached = cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const startIndex = Math.max(0, (page - 1) * pageSize);
  const endIndex = startIndex + pageSize;
  const items: ReturnType<typeof normalizeMarket>[] = [];
  let matchedCount = 0;
  let reachedEnd = false;
  let upstreamTotal: number | null = null;

  try {
    for (let apiPage = 1; apiPage <= MAX_SCAN_PAGES; apiPage += 1) {
      const payload = await opinionFetch<unknown>('markets', {
        query: {
          page: apiPage,
          pageSize,
          limit: pageSize,
          q,
          status,
          chainId,
          quoteToken,
          sort
        }
      });

      if (payload && typeof payload === 'object') {
        const typed = payload as Record<string, unknown>;
        if (typeof typed.errno === 'number' && typed.errno !== 0) {
          const errmsg = typeof typed.errmsg === 'string' ? typed.errmsg : 'Upstream error';
          throw new Error(`Opinion API error: ${errmsg}`);
        }
      }

      if (upstreamTotal === null) {
        upstreamTotal = extractTotal(payload);
      }

      const rawMarkets = extractMarkets(payload);
      if (rawMarkets.length === 0) {
        if (payload && typeof payload === 'object') {
          console.warn('[api/markets] empty list', {
            keys: Object.keys(payload as Record<string, unknown>).slice(0, 10)
          });
        }
        reachedEnd = true;
        break;
      }

      for (const raw of rawMarkets) {
        const market = normalizeMarket(raw);
        if (!matchesFilter(market, { q, status, chainId, quoteToken })) {
          continue;
        }
        if (matchedCount >= startIndex && items.length < pageSize) {
          items.push(market);
        }
        matchedCount += 1;
        if (items.length >= pageSize && matchedCount >= endIndex) {
          break;
        }
      }

      if (items.length >= pageSize && matchedCount >= endIndex) {
        break;
      }

      if (rawMarkets.length < pageSize) {
        reachedEnd = true;
        break;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/markets] error', { message, page, pageSize });
    return NextResponse.json(
      {
        error: 'Upstream request failed',
        message
      },
      { status: 500 }
    );
  }

  const response = {
    total: upstreamTotal ?? matchedCount,
    list: items.map((market) => ({
      marketId: market.marketId,
      marketTitle: market.title,
      statusEnum: market.status,
      chainId: market.chainId,
      quoteToken: market.quoteToken,
      volume24h: market.volume24h,
      volume7d: market.volume7d,
      totalVolume: market.totalVolume,
      childMarkets: market.childMarkets
    })),
    page,
    pageSize,
    hasMore: !reachedEnd
  };

  cache.set(cacheKey, response);

  return NextResponse.json(response);
}
