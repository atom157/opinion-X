import { NextResponse } from 'next/server';
import { LruTtlCache } from '@/lib/cache';
import { opinionFetch } from '@/lib/opinionApi';
import { normalizeMarket, RawMarket } from '@/lib/normalize';

const cache = new LruTtlCache({ maxSize: 200, ttlMs: 60_000 });

const fetchMarketById = async (marketId: string): Promise<RawMarket> => {
  try {
    return await opinionFetch<RawMarket>(`markets/${marketId}`);
  } catch (error) {
    return await opinionFetch<RawMarket>(`market/${marketId}`);
  }
};

export async function GET(
  _request: Request,
  context: { params: { marketId: string } }
) {
  const marketId = context.params.marketId;
  const cached = cache.get(marketId);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const raw = await fetchMarketById(marketId);
    if (raw && typeof raw === 'object') {
      const typed = raw as Record<string, unknown>;
      if (typeof typed.errno === 'number' && typed.errno !== 0) {
        const errmsg = typeof typed.errmsg === 'string' ? typed.errmsg : 'Upstream error';
        throw new Error(`Opinion API error: ${errmsg}`);
      }
    }
    const market = normalizeMarket(raw);

    const response = {
      marketId: market.marketId,
      title: market.title,
      status: market.status,
      rules: market.rules,
      createdAt: market.createdAt,
      cutoffAt: market.cutoffAt,
      resolvedAt: market.resolvedAt,
      childMarkets: market.childMarkets.map((child) => ({
        marketId: child.marketId,
        title: child.title,
        resolvedAt: child.resolvedAt,
        yesTokenId: child.yesTokenId,
        noTokenId: child.noTokenId,
        totalVolume: child.totalVolume
      }))
    };

    cache.set(marketId, response);

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/market] error', { message, marketId });
    return NextResponse.json(
      {
        error: 'Upstream request failed',
        message
      },
      { status: 500 }
    );
  }
}
