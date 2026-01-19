import { NextResponse } from 'next/server';
import { opinionFetch } from '@/lib/opinionApi';
import { normalizeMarket, summarizeTokenLocation, RawMarket } from '@/lib/normalize';

const fetchMarketById = async (marketId: string): Promise<RawMarket> => {
  try {
    return await opinionFetch<RawMarket>(`markets/${marketId}`);
  } catch (error) {
    return await opinionFetch<RawMarket>(`market/${marketId}`);
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get('marketId');
  const apiBase = process.env.OPINION_API_BASE || 'https://openapi.opinion.trade/openapi';
  const hasKey = Boolean(process.env.OPINION_API_KEY);

  let probe: { status: number | null; sampleKeys: string[]; message?: string } = {
    status: null,
    sampleKeys: []
  };

  try {
    const payload = await opinionFetch<unknown>('markets', {
      query: { page: 1, pageSize: 1, limit: 1 }
    });
    if (payload && typeof payload === 'object') {
      probe = {
        status: 200,
        sampleKeys: Object.keys(payload as Record<string, unknown>).slice(0, 10)
      };
    }
  } catch (error) {
    probe = {
      status: null,
      sampleKeys: [],
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  if (!marketId) {
    return NextResponse.json({
      config: { apiBase, hasKey },
      probe
    });
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
    const tokens = summarizeTokenLocation(market);

    return NextResponse.json({
      config: { apiBase, hasKey },
      probe,
      market,
      tokens
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/debug] error', { message, marketId });
    return NextResponse.json(
      {
        config: { apiBase, hasKey },
        probe,
        error: 'Upstream request failed',
        message
      },
      { status: 500 }
    );
  }
}
