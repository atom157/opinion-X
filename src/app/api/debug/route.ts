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
  if (!marketId) {
    return NextResponse.json({ error: 'marketId is required' }, { status: 400 });
  }

  const raw = await fetchMarketById(marketId);
  const market = normalizeMarket(raw);
  const tokens = summarizeTokenLocation(market);

  return NextResponse.json({ market, tokens });
}
