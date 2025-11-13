'use client'

import { Eye, SendHorizontalIcon, Settings, Loader2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PipelineHeaderProps {
  pipelineTitle: string
  onRun: () => void
  isFormValid: boolean
  estimatedRuntime: string
  activeTab: string
  onTabChange: (tab: string) => void
  isStartingWorkflow?: boolean
  operatingMode?: string
  onOperatingModeChange?: (mode: string) => void
}

export function PipelineHeader({ 
  pipelineTitle,
  onRun,
  isFormValid,
  estimatedRuntime,
  activeTab,
  onTabChange,
  isStartingWorkflow = false,
  operatingMode = 'standard',
  onOperatingModeChange
}: PipelineHeaderProps) {
  const router = useRouter()

  return (
    <div className="pl-4 pr-4 pt-6 pb-4">
      <div className="flex items-center justify-between gap-4">
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
        
        {/* Operating Mode Select - Center */}
        <div className="flex-1 flex justify-center">
          <div className="flex flex-col items-center gap-1">
            <Select value={operatingMode} onValueChange={onOperatingModeChange}>
              <SelectTrigger className="w-[320px]">
                <SelectValue placeholder="Select operating mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Operating Modes</SelectLabel>
                  <SelectItem value="standard" className="py-2">
                    <div className="flex flex-col items-start">
                      <span>Standard Boltzgen</span>
                      <span className="text-xs text-muted-foreground">(protocols)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="binder-optimization" className="py-2">
                    <div className="flex flex-col items-start">
                      <span>Binder Optimization Boltzgen</span>
                      <span className="text-xs text-muted-foreground">(multi target/objective)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="iterative-iptm" className="py-2">
                    <div className="flex flex-col items-start">
                      <span>Iterative Boltzgen + iPTM</span>
                      <span className="text-xs text-muted-foreground">(inference time)</span>
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Start Workflow Button */}
        <Button  
          onClick={onRun} 
          disabled={!isFormValid || isStartingWorkflow}
          className="w-auto"
        >
          {isStartingWorkflow ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              Start Workflow
              <SendHorizontalIcon className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}