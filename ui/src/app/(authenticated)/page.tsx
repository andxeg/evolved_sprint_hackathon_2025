'use client'

import { 
  ArrowRight,
  Lock} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React from 'react'

// Import mock data
import templatesData from '@/app/(authenticated)/data/templates.json'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type WorkflowStep = {
  step: number
  title: string
  description: string
}

type Template = {
  id: string
  title: string
  description: string
  icon: string
  status: 'active' | 'coming-soon'
  phases: number
  workflowSteps?: WorkflowStep[]
  features: string[]
  models?: {
    name: string
    catalogUrl: string
  }[]
  stats?: {
    totalDesigns: string
    targets: string
    experimentalSuccess: string
    maxHitRate: string
    validatedTargets: string
  }
  url: string
  color: string
}

const getPipelineImage = (id: string) => {
  const imageMap: { [key: string]: string } = {
    'boltzgen': '/pipelines/bg-t.png',
  }
  return imageMap[id] || '/pipelines/bg-t.png'
}

const colorClasses = {
  blue: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
  green: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
  purple: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950'
}

export default function WorkflowTemplatesPage() {
  const router = useRouter()
  const templates = templatesData as Template[]

  const handleTemplateClick = (template: Template) => {
    if (template.status === 'active') {
      router.push(template.url)
    }
  }

  return (
    <div className="p-4 space-y-6">


      {/* Templates Grid */}
      <div className={templates.length === 1 
        ? "flex justify-center gap-6" 
        : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      }>
        {templates.map((template) => (
          <Card 
            key={template.id}
            className={`transition-all duration-200 hover:shadow-lg cursor-pointer flex flex-col h-full ${
              templates.length === 1 ? 'max-w-md w-full' : ''
            } ${
              template.status === 'active' 
                ? `hover:scale-[1.02] ${colorClasses[template.color as keyof typeof colorClasses]}` 
                : 'opacity-75 cursor-not-allowed'
            }`}
            onClick={() => handleTemplateClick(template)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 flex items-center justify-center rounded-lg overflow-hidden">
                  <Image
                    src={getPipelineImage(template.id)}
                    alt={template.title}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                    priority={true}
                    unoptimized={true}
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                      console.error('Image failed to load:', getPipelineImage(template.id))
                      // Fallback to a default icon
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <CardTitle className="text-xl">{template.title}</CardTitle>
                </div>
                {template.status === 'active' ? (
                  <Button 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(template.url)
                    }}
                  >
                    Use Workflow
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Lock className="w-3 h-3 mr-1" />
                    Coming Soon
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm leading-relaxed line-clamp-2">
                {template.description}
              </CardDescription>
              
              {/* Workflow Steps */}
              {template.workflowSteps && template.workflowSteps.length > 0 && (
                <div className="space-y-3 mt-4">
                  {template.workflowSteps.map((step) => (
                    <div key={step.step} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                        {step.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {step.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {step.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>


    </div>
  )
}