import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DAO Voting Platform',
  description: 'Gasless voting powered by meta-transactions',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
