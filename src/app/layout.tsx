import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { BottomNav } from '@/components/BottomNav';
import { AIFAB } from '@/components/AIFAB';
import { TopAppBar } from '@/components/TopAppBar';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Anniversary 101',
  description: 'Mobile-first logistics application',
  manifest: '/manifest.json',
  themeColor: '#2563EB',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Anniversary 101',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} bg-[#F9FAFB] text-gray-900 min-h-screen flex justify-center h-full overflow-hidden`}>
        {/* Main Viewport Container: Locked to 480px, centered, with border */}
        <div className="w-full max-w-[480px] bg-white border-x border-gray-200 min-h-screen flex flex-col relative shadow-2xl h-full overflow-hidden">
          <TopAppBar />
          
          <main className="flex-1 overflow-y-auto pb-24 relative px-4">
            {children}
          </main>

          <AIFAB />
          <BottomNav />
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#FFFFFF',
                color: '#1F2937',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                border: '1px border #F3F4F6'
              }
            }}
          />
        </div>
      </body>
    </html>
  );
}
