import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { BottomNav } from '@/components/BottomNav';
import { VoiceFAB } from '@/components/VoiceFAB';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Anniversary Logistics',
  description: 'Mobile-first logistics application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen pb-20`}>
        <main className="max-w-md mx-auto min-h-screen relative bg-white shadow-xl overflow-x-hidden">
          {children}
          <VoiceFAB />
          <BottomNav />
        </main>
      </body>
    </html>
  );
}
