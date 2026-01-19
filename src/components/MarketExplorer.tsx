'use client';

import { useEffect, useMemo, useState } from 'react';

export type MarketSummary = {
  marketId: string;
  title: string;
  status: string | null;
  chainId: number | null;
  quoteToken: string | null;
  volume24h: number | null;
  volume7d: number | null;
  totalVolume: number | null;
  childCount: number;
};

type MarketsResponse = {
  items?: MarketSummary[];
  list?: Array<{
    marketId: string;
    marketTitle?: string;
    statusEnum?: string | null;
    chainId?: number | null;
    quoteToken?: string | null;
    volume24h?: number | null;
    volume7d?: number | null;
    totalVolume?: number | null;
    childMarkets?: unknown[];
  }>;
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
};

const formatNumber = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
};

export default function MarketExplorer() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [chainId, setChainId] = useState('');
  const [quoteToken, setQuoteToken] = useState('');
  const [sort, setSort] = useState('volume24h');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MarketsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const search = new URLSearchParams();
    search.set('page', String(page));
    search.set('pageSize', String(pageSize));
    if (query.trim()) search.set('q', query.trim());
    if (status) search.set('status', status);
    if (chainId) search.set('chainId', chainId);
    if (quoteToken) search.set('quoteToken', quoteToken);
    if (sort) search.set('sort', sort);
    return search.toString();
  }, [page, pageSize, query, status, chainId, quoteToken, sort]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/markets?${params}`)
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'Failed to load markets');
        }
        return response.json();
      })
      .then((payload: MarketsResponse) => {
        if (!active) return;
        setData(payload);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message ?? 'Unable to load markets');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params]);

  const handleReset = () => {
    setQuery('');
    setStatus('');
    setChainId('');
    setQuoteToken('');
    setSort('volume24h');
    setPageSize(20);
    setPage(1);
  };

  const normalizedItems: MarketSummary[] = useMemo(() => {
    if (data?.items) return data.items;
    if (data?.list) {
      return data.list.map((market) => ({
        marketId: market.marketId,
        title: market.marketTitle ?? 'Untitled market',
        status: market.statusEnum ?? null,
        chainId: market.chainId ?? null,
        quoteToken: market.quoteToken ?? null,
        volume24h: market.volume24h ?? null,
        volume7d: market.volume7d ?? null,
        totalVolume: market.totalVolume ?? null,
        childCount: Array.isArray(market.childMarkets) ? market.childMarkets.length : 0
      }));
    }
    return [];
  }, [data]);

  const canGoBack = page > 1;
  const canGoNext = data?.hasMore ?? normalizedItems.length === pageSize;

  return (
    <div className="panel" style={{ padding: 0 }}>
      <div className="panel" style={{ border: 'none', paddingBottom: 0 }}>
        <div className="filters">
          <div>
            <label htmlFor="search">Search title</label>
            <input
              id="search"
              placeholder="Search markets"
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
            />
          </div>
          <div>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
            >
              <option value="">All</option>
              <option value="Open">Open</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label htmlFor="chainId">Chain ID</label>
            <input
              id="chainId"
              placeholder="e.g. 1"
              value={chainId}
              onChange={(event) => {
                setPage(1);
                setChainId(event.target.value);
              }}
            />
          </div>
          <div>
            <label htmlFor="quoteToken">Quote Token</label>
            <input
              id="quoteToken"
              placeholder="e.g. USDC"
              value={quoteToken}
              onChange={(event) => {
                setPage(1);
                setQuoteToken(event.target.value);
              }}
            />
          </div>
          <div>
            <label htmlFor="sort">Sort</label>
            <select
              id="sort"
              value={sort}
              onChange={(event) => {
                setPage(1);
                setSort(event.target.value);
              }}
            >
              <option value="volume24h">Volume 24h</option>
              <option value="volume7d">Volume 7d</option>
              <option value="totalVolume">Total Volume</option>
            </select>
          </div>
          <div>
            <label htmlFor="pageSize">Page size</label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="secondary"
            onClick={handleReset}
            disabled={loading}
          >
            Reset filters
          </button>
        </div>
      </div>
      <div className="panel" style={{ border: 'none', paddingTop: 0 }}>
        {loading && <p className="notice">Loading markets...</p>}
        {error && <p className="notice">{error}</p>}
        {!loading && !error && normalizedItems.length === 0 && (
          <p className="notice">No markets match your filters.</p>
        )}
        {!loading && normalizedItems.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Status</th>
                <th>Chain</th>
                <th>Quote</th>
                <th>24h</th>
                <th>7d</th>
                <th>Total</th>
                <th>Children</th>
              </tr>
            </thead>
            <tbody>
              {normalizedItems.map((market) => (
                <tr key={market.marketId}>
                  <td>
                    <a href={`/market/${market.marketId}`}>{market.title}</a>
                  </td>
                  <td>{market.status ? <span className="badge">{market.status}</span> : '—'}</td>
                  <td>{market.chainId ?? '—'}</td>
                  <td>{market.quoteToken ?? '—'}</td>
                  <td>{formatNumber(market.volume24h)}</td>
                  <td>{formatNumber(market.volume7d)}</td>
                  <td>{formatNumber(market.totalVolume)}</td>
                  <td>{market.childCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <div className="button-row" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="secondary"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={!canGoBack || loading}
          >
            Previous
          </button>
          <span className="notice">Page {data?.page ?? page}</span>
          <button
            type="button"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!canGoNext || loading}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
