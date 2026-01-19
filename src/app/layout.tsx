import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Opinion Builders Program - MVP',
  description: 'Market discovery dashboard for Opinion markets.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div>
              <h1>Opinion Builders Program</h1>
              <p>Market discovery dashboard for Opinion markets.</p>
            </div>
            <nav>
              <a href="/">Home</a>
              <a href="/health">Health</a>
            </nav>
          </header>
          <main className="app-main">{children}</main>
          <footer className="app-footer">
            <span>Built for Opinion Builders Program MVP.</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
