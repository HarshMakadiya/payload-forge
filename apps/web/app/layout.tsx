import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Payload Forge',
  description: 'Controlled API load testing with realistic payloads',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
