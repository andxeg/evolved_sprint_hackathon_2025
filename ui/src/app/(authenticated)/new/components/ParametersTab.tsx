'use client'

import React from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { YamlEditor } from './YamlEditor'

interface ParametersTabProps {
  onResetToDefaults: () => void
  onSaveChanges: () => void
  vhhConfigYaml: string
  onYamlChange: (value: string) => void
  hasChanges: boolean
  validationResult: any
  saveMessage: string | null
  isResetting: boolean
}

export function ParametersTab({ 
  onResetToDefaults, 
  onSaveChanges,
  vhhConfigYaml,
  onYamlChange,
  hasChanges,
  validationResult,
  saveMessage,
  isResetting
}: ParametersTabProps) {

  const handleYamlChange = (value: string) => {
    onYamlChange(value)
  }

  const handleSave = async () => {
    // Call the parent's save handler (validation is handled there)
    onSaveChanges()
  }

  const handleReset = async () => {
    // Call the parent's reset handler
    onResetToDefaults()
  }


  return (
    <div className="h-full flex flex-col p-4 overflow-hidden w-full">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full">
        <div className="flex items-center justify-between mb-4 mt-6">
          <div className="flex items-center gap-4">
            {hasChanges && (
              <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                • Unsaved changes
              </span>
            )}
            {saveMessage && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                  {saveMessage}
                </span>
              </div>
            )}
            {isResetting && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Resetting to default configuration...
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Validation Errors */}
            {validationResult && !validationResult.isValid && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                        {validationResult.errors.length} validation error{validationResult.errors.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-md">
                    <div className="space-y-1">
                      <div className="font-medium text-primary-foreground mb-2">Validation Errors:</div>
                      <ul className="space-y-1">
                        {validationResult.errors.map((error: string, index: number) => (
                          <li key={index} className="text-xs text-primary-foreground/90">
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Validation Warnings */}
            {validationResult && validationResult.isValid && validationResult.warnings.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                        {validationResult.warnings.length} warning{validationResult.warnings.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-md">
                    <div className="space-y-1">
                      <div className="font-medium text-primary-foreground mb-2">Warnings:</div>
                      <ul className="space-y-1">
                        {validationResult.warnings.map((warning: string, index: number) => (
                          <li key={index} className="text-xs text-primary-foreground/90">
                            • {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            

            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
                    Resetting...
                  </>
                ) : (
                  'Reset to Defaults'
                )}
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={!hasChanges || (validationResult ? !validationResult.isValid : false)}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-h-0">
          <YamlEditor
            value={vhhConfigYaml}
            onChange={handleYamlChange}
            onSave={handleSave}
            onReset={handleReset}
            isLoading={false}
            error={null}
          />
        </div>

      </div>
    </div>
  )
}