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
  if (Array.isArray(typed.markets)) return typed.markets as RawMarket[];
  if (Array.isArray(typed.data)) return typed.data as RawMarket[];
  if (typed.data && typeof typed.data === 'object') {
    const nested = typed.data as Record<string, unknown>;
    if (Array.isArray(nested.items)) return nested.items as RawMarket[];
    if (Array.isArray(nested.markets)) return nested.markets as RawMarket[];
  }
  return [];
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
  const requestedPageSize = Number(searchParams.get('pageSize') ?? '20');
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

  for (let apiPage = 1; apiPage <= MAX_SCAN_PAGES; apiPage += 1) {
    const payload = await opinionFetch<unknown>('markets', {
      query: {
        page: apiPage,
        pageSize,
        q,
        status,
        chainId,
        quoteToken,
        sort
      }
    });

    const rawMarkets = extractMarkets(payload);
    if (rawMarkets.length === 0) {
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

  const response = {
    items: items.map((market) => ({
      marketId: market.marketId,
      title: market.title,
      status: market.status,
      chainId: market.chainId,
      quoteToken: market.quoteToken,
      volume24h: market.volume24h,
      volume7d: market.volume7d,
      totalVolume: market.totalVolume,
      childCount: market.childMarkets.length
    })),
    page,
    pageSize,
    hasMore: !reachedEnd
  };

  cache.set(cacheKey, response);

  return NextResponse.json(response);
}
