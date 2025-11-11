'use client'
import React from 'react'
import Image from 'next/image'
import { Header } from '@/components/header'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <LayoutContent>
        {children}
      </LayoutContent>
      <footer className="mt-auto py-2 flex flex-col justify-center items-center gap-4 pt-0">
        <div className="flex justify-center items-center gap-8">
          <Image
            src="/ev.png"
            alt="Evolved 25"
            width={120}
            height={40}
            className="h-8 w-auto opacity-60"
            priority={false}
          />
          <Image
            src="/nebious.avif"
            alt="Nebius"
            width={240}
            height={120}
            className="h-24 w-auto opacity-60"
            priority={false}
          />
          <Image
            src="/nvidia.avif"
            alt="NVIDIA"
            width={240}
            height={120}
            className="h-24 w-auto opacity-60"
            priority={false}
          />
        </div>
        <p className="text-sm text-muted-foreground">Fastfold AI team</p>

      </footer>
    </div>
  )
}

function LayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-1 flex-col `}>
      {children}
    </div>
  )
}