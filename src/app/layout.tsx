// Use the Inter variable font already present in public/fonts/Inter/ for POC/demo purposes.
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const inter = localFont({
  src: [
    {
      path: '/fonts/Inter/Inter-VariableFont_opsz,wght.ttf',
      weight: '400',
      style: 'normal',
    },
    // Add more weights/styles as needed
  ],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'AI Comic Generator',
  description: 'Create comics with AI-generated images and characters',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}