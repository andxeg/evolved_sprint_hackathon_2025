'use client'

import { Eye, SendHorizontalIcon, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React from 'react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PipelineHeaderProps {
  pipelineTitle: string
  onRun: () => void
  isFormValid: boolean
  estimatedRuntime: string
  activeTab: string
  onTabChange: (tab: string) => void
}

export function PipelineHeader({ 
  pipelineTitle,
  onRun,
  isFormValid,
  estimatedRuntime,
  activeTab,
  onTabChange
}: PipelineHeaderProps) {
  const router = useRouter()

  return (
    <div className="pl-4 pr-4 pt-6 pb-4">
      <div className="flex items-center justify-between">
        {/* Tab Controls */}
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="inline-flex h-8 items-center justify-center rounded-md p-1 w-auto">
            <TabsTrigger 
              value="overview" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <Eye className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="parameters" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Design Spec (YML)
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Start Workflow Button */}
        <Button  
          onClick={() => {}} 
          disabled={true}
          className="w-auto"
        >
          Start Workflow
          <SendHorizontalIcon className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}