const baseUrl = process.env.OPINION_API_BASE || 'https://openapi.opinion.trade/openapi';
const apiKey = process.env.OPINION_API_KEY;

if (!apiKey) {
  console.error('Missing OPINION_API_KEY');
  process.exit(1);
}

const buildUrl = (path) => {
  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  return url.toString();
};

const fetchJson = async (path) => {
  const response = await fetch(buildUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    }
  });
  const text = await response.text();
  return { status: response.status, body: text.slice(0, 1000) };
};

const run = async () => {
  const list = await fetchJson('markets?page=1&pageSize=1');
  console.log('markets:', list.status, list.body);
  const detail = await fetchJson('markets/EXAMPLE_MARKET_ID');
  console.log('market detail (replace EXAMPLE_MARKET_ID):', detail.status, detail.body);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
