export type RawMarket = Record<string, unknown>;

export type NormalizedMarket = {
  marketId: string;
  title: string;
  status: string | null;
  rules: string | null;
  chainId: number | null;
  quoteToken: string | null;
  volume24h: number | null;
  volume7d: number | null;
  totalVolume: number | null;
  createdAt: string | null;
  cutoffAt: string | null;
  resolvedAt: string | null;
  yesTokenId: string | null;
  noTokenId: string | null;
  childMarkets: NormalizedMarket[];
};

const toString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const toNumber = (value: unknown): number | null =>
  typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : null;

const pickChildMarkets = (raw: RawMarket): RawMarket[] => {
  const candidates = raw.childMarkets ?? raw.child_markets ?? raw.children;
  if (Array.isArray(candidates)) {
    return candidates as RawMarket[];
  }
  return [];
};

export const normalizeMarket = (raw: RawMarket): NormalizedMarket => {
  const marketId =
    toString(raw.marketId) ||
    toString(raw.id) ||
    toString(raw.market_id) ||
    "unknown";

  const childMarkets = pickChildMarkets(raw).map((child) => normalizeMarket(child));

  return {
    marketId,
    title: toString(raw.marketTitle) || toString(raw.title) || "Untitled market",
    status: toString(raw.statusEnum) || toString(raw.status) || null,
    rules: toString(raw.rules) || toString(raw.rule) || null,
    chainId: toNumber(raw.chainId) ?? toNumber(raw.chain_id),
    quoteToken: toString(raw.quoteToken) || toString(raw.quote_token) || null,
    volume24h: toNumber(raw.volume24h) ?? toNumber(raw.volume_24h),
    volume7d: toNumber(raw.volume7d) ?? toNumber(raw.volume_7d),
    totalVolume: toNumber(raw.totalVolume) ?? toNumber(raw.total_volume) ?? toNumber(raw.volume),
    createdAt: toString(raw.createdAt) || toString(raw.created_at),
    cutoffAt: toString(raw.cutoffAt) || toString(raw.cutoff_at),
    resolvedAt: toString(raw.resolvedAt) || toString(raw.resolved_at),
    yesTokenId: toString(raw.yesTokenId) || toString(raw.yes_token_id) || null,
    noTokenId: toString(raw.noTokenId) || toString(raw.no_token_id) || null,
    childMarkets
  };
};

export const summarizeTokenLocation = (market: NormalizedMarket) => {
  const hasRootTokens = Boolean(market.yesTokenId || market.noTokenId);
  const childTokens = market.childMarkets
    .filter((child) => child.yesTokenId || child.noTokenId)
    .map((child) => ({
      marketId: child.marketId,
      yesTokenId: child.yesTokenId,
      noTokenId: child.noTokenId
    }));

  return {
    rootTokens: hasRootTokens
      ? { yesTokenId: market.yesTokenId, noTokenId: market.noTokenId }
      : null,
    childTokens
  };
};
