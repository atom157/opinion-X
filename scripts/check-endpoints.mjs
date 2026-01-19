const baseUrl = process.env.CHECK_BASE_URL || 'http://localhost:3000';

const check = async (path) => {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${path} failed: ${response.status} ${text}`);
  }
  const data = await response.json();
  console.log(path, JSON.stringify(data).slice(0, 200));
};

const run = async () => {
  await check('/health');
  await check('/api/markets?page=1&pageSize=1');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
