import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';
import './app.css';

export const metadata: Metadata = {
  title: 'BuildMate AI - Construction Cost Estimator',
  description:
    'AI-powered construction estimating suite. Build clear, defensible project budgets in minutes with predictive cost intelligence.',
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
