# Opinion Builders Program MVP

Market discovery dashboard for Opinion markets. Built with Next.js App Router and a minimal in-memory cache.

## Features
- Search by title keyword, filter by status, chain ID, and quote token.
- Sort by 24h volume, 7d volume, or total volume.
- Paginated markets (20/50 per page).
- Market detail page with child market table.
- API proxy routes so the client never needs an API key.
- Health check endpoint at `/health`.

## Requirements
- Node.js 18+
- Opinion API key

## Local Development
```bash
npm install
npm run dev
```

Create a `.env.local` file using `.env.example`:
```bash
cp .env.example .env.local
```

Update `OPINION_API_KEY` with your key.

## Production
```bash
npm install
npm run build
npm start
```

## Railway Deployment Steps
1. Create a new Railway project from this GitHub repo.
2. Set environment variables:
   - `OPINION_API_KEY` = your Opinion API key
   - `OPINION_API_BASE` = `https://openapi.opinion.trade/openapi` (optional)
3. Set the build command: `npm run build`
4. Set the start command: `npm start`
5. Deploy.

## API Routes
- `GET /api/markets?page=&pageSize=&q=&status=&chainId=&quoteToken=&sort=`
- `GET /api/market/:marketId`
- `GET /api/debug?marketId=`
- `GET /health`

## Health & Debug Script
After running the dev server:
```bash
npm run check:endpoints
```

## Notes
- The server uses pagination scanning with early stop and TTL caching to avoid loading all markets into memory.
- If the Opinion API uses a different market list path, update `src/app/api/markets/route.ts` accordingly.
- Reference UI check: the build environment could not reach `https://webfeng.org/opview/`, so the MVP mirrors the table-driven layout shown in the provided screenshot (search, filters, status badges, and a market list table).
