import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TalentPool — CV Havuzu & ATS',
  description: 'Modern İnsan Kaynakları Aday Takip Sistemi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
