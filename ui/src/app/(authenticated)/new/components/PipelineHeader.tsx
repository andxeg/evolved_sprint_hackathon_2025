'use client'

import { SendHorizontalIcon, Loader2 } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'

interface PipelineHeaderProps {
  pipelineTitle: string
  onRun: () => void
  isFormValid: boolean
  estimatedRuntime: string
  activeTab: string
  onTabChange: (tab: string) => void
  isStartingWorkflow?: boolean
}

export function PipelineHeader({ 
  pipelineTitle,
  onRun,
  isFormValid,
  estimatedRuntime,
  activeTab: _activeTab,
  onTabChange: _onTabChange,
  isStartingWorkflow = false,
}: PipelineHeaderProps) {
  return (
    <div className="pl-4 pr-4 pt-6 pb-4">
      <div className="flex items-center justify-between gap-4">
        {/* Title on the left */}
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{pipelineTitle}</h1>
          <p className="text-xs text-muted-foreground">Estimated runtime: {estimatedRuntime}</p>
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