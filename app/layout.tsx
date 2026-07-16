import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { AuthProvider } from '@/lib/auth'
import { ThemeProvider, themeInitScript } from '@/lib/theme'
import { LabDataProvider } from '@/lib/lab-data'

export const metadata: Metadata = {
  title: {
    default: 'FanLearn Lab — 泛学习实验室',
    template: '%s | FanLearn Lab',
  },
  description:
    'FanLearn Lab 专注于人工智能与教育融合研究，致力于探索学习的本质规律，开发面向未来的智能学习系统。',
  keywords: ['教育技术', '学习分析', '大语言模型', '智能辅导', 'FanLearn Lab', '北京大学'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <AuthProvider>
            <LabDataProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </LabDataProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
