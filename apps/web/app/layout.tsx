import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EventRisk Kempen',
  description: 'Evenementenportaal met risicoanalyse en synchronisatie'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
