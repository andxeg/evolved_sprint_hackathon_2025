'use client'

import { MessageSquare,Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface CreditsDisplayProps {
  totalCredits?: number
  remainingCredits?: number
  onUpgrade?: () => void
  onSendFeedback?: () => void
  feedbackUrl?: string
}

export function CreditsDisplay({ 
  totalCredits = 10000, 
  remainingCredits = 10000, 
  onUpgrade,
  onSendFeedback,
  feedbackUrl = 'https://form.typeform.com/to/VIymlHYl'
}: CreditsDisplayProps) {
  const _usagePercentage = totalCredits > 0 ? ((totalCredits - remainingCredits) / totalCredits) * 100 : 0
  
  return (
    <div className="flex items-center gap-3">
    {/* Credits Display 
      
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-yellow-500" />
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">Credits:</span>
          <span className="font-medium">{remainingCredits.toLocaleString()}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{totalCredits.toLocaleString()}</span>
        </div>
      </div>

      */}
      
    
      
      {/* Upgrade Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onUpgrade}
        className="h-7 px-3 text-xs font-medium"
      >
        <Zap className="h-3 w-3 mr-1" />
        Upgrade
      </Button>

      {/* Send Feedback Button */}
      <Button
        size="sm"
        onClick={() => {
          if (onSendFeedback) {
            onSendFeedback()
          } else {
            window.open(feedbackUrl, '_blank', 'noopener,noreferrer')
          }
        }}
        className="h-7 px-3 text-xs font-medium"
      >
        <MessageSquare className="h-3 w-3 mr-1" />
        Send Feedback
      </Button>
    </div>
  )
} 