import MarketExplorer from '@/components/MarketExplorer';

export default function HomePage() {
  return (
    <div className="panel">
      <h2>Market Discovery</h2>
      <p className="notice">
        Search Opinion markets by title keywords, filter by status or chain, and
        explore child markets.
      </p>
      <MarketExplorer />
    </div>
  );
}
