'use client';

import { useEffect, useState } from 'react';

type ChildMarket = {
  marketId: string;
  title: string;
  resolvedAt: string | null;
  yesTokenId: string | null;
  noTokenId: string | null;
  totalVolume: number | null;
};

type MarketDetail = {
  marketId: string;
  title: string;
  status: string | null;
  rules: string | null;
  createdAt: string | null;
  cutoffAt: string | null;
  resolvedAt: string | null;
  childMarkets: ChildMarket[];
};

const formatNumber = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
};

export default function MarketDetailPage({ params }: { params: { marketId: string } }) {
  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/market/${params.marketId}`)
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'Failed to load market');
        }
        return response.json();
      })
      .then((payload: MarketDetail) => {
        if (!active) return;
        setMarket(payload);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message ?? 'Unable to load market');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.marketId]);

  if (loading) {
    return (
      <div className="panel">
        <p className="notice">Loading market...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <p className="notice">{error}</p>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="panel">
        <p className="notice">Market not found.</p>
      </div>
    );
  }

  const opinionUrl = `https://app.opinion.trade/market/${market.marketId}`;

  return (
    <div className="panel">
      <div>
        <h2>{market.title}</h2>
        <p className="notice">Market ID: {market.marketId}</p>
      </div>
      <div className="button-row">
        <a className="badge" href={opinionUrl} target="_blank" rel="noreferrer">
          Open on Opinion
        </a>
        {market.status ? <span className="badge">{market.status}</span> : null}
      </div>
      <div className="meta-grid">
        <div className="meta-item">
          <strong>Rules</strong>
          <span>{market.rules ?? '—'}</span>
        </div>
        <div className="meta-item">
          <strong>Created At</strong>
          <span>{market.createdAt ?? '—'}</span>
        </div>
        <div className="meta-item">
          <strong>Cutoff At</strong>
          <span>{market.cutoffAt ?? '—'}</span>
        </div>
        <div className="meta-item">
          <strong>Resolved At</strong>
          <span>{market.resolvedAt ?? '—'}</span>
        </div>
      </div>
      <div className="panel" style={{ border: 'none', padding: 0 }}>
        <h3>Child Markets</h3>
        {market.childMarkets.length === 0 ? (
          <p className="notice">No child markets reported.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Yes Token</th>
                <th>No Token</th>
                <th>Total Volume</th>
                <th>Resolved At</th>
              </tr>
            </thead>
            <tbody>
              {market.childMarkets.map((child) => (
                <tr key={child.marketId}>
                  <td>
                    <a href={`/market/${child.marketId}`}>{child.title}</a>
                  </td>
                  <td>{child.yesTokenId ?? '—'}</td>
                  <td>{child.noTokenId ?? '—'}</td>
                  <td>{formatNumber(child.totalVolume)}</td>
                  <td>{child.resolvedAt ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
