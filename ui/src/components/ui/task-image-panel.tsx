'use client'
import Image from 'next/image'
import * as React from 'react'
import { useEffect,useState } from 'react'

import NglViewer from "@/app/(authenticated)/tasks_old/ngl-viever"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TaskImagePanelProps {
  isOpen: boolean
  onClose: () => void
  tasks: {
    id: string
    task_order: number
    pae_plot_url?: string
    plddt_plot_url?: string
    cif_url?: string
  }[]
}

// Function to fetch image asset (similar to fetchAsset in tasks.ts)
const fetchImageAsset = async (fullUrl: string): Promise<string | null> => {
  if (!fullUrl) return null
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL
  
  // Extract the file path from the full URL
  // URL format: https://service.fastfold.ai/v1/sequences/files/job_id/job_run_id/sequence_id/filename
  const urlParts = fullUrl.split('/v1/sequences/files/')
  if (urlParts.length !== 2) {
    console.warn(`Invalid URL format: ${fullUrl}`)
    return null
  }
  
  const filePath = urlParts[1]
  
  try {
    const response = await fetch(`${API_URL}/v1/sequences/files/${filePath}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }, 
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching image:', error)
    return null
  }
}

export function TaskImagePanel({ isOpen, onClose: _onClose, tasks }: TaskImagePanelProps) {
  const [taskImages, setTaskImages] = useState<Map<string, { pae: string | null, plddt: string | null }>>(new Map())
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('structure')

  useEffect(() => {
    if (isOpen && tasks.length > 0) {
      setLoading(true)
      
      const fetchAllImages = async () => {
        const newTaskImages = new Map()
        
        try {
          for (const task of tasks) {
            const [paeUrl, plddtUrl] = await Promise.all([
              task.pae_plot_url ? fetchImageAsset(task.pae_plot_url) : null,
              task.plddt_plot_url ? fetchImageAsset(task.plddt_plot_url) : null
            ])
            
            newTaskImages.set(task.id, { pae: paeUrl, plddt: plddtUrl })
          }
          
          setTaskImages(newTaskImages)
        } catch (error) {
          console.error('Error fetching images:', error)
        } finally {
          setLoading(false)
        }
      }
      
      fetchAllImages()
    }
  }, [isOpen, tasks])

  const _handleDownload = (imageUrl: string | null, filename: string) => {
    if (!imageUrl) return
    
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const _handleExternalLink = (url: string) => {
    window.open(url, '_blank')
  }

  // Sort tasks by task order for consistent display
  const sortedTasks = tasks.sort((a, b) => a.task_order - b.task_order)
  
  // Extract all CIF URLs for the structure tab, sorted by task order
  const cifUrls = sortedTasks
    .map(task => task.cif_url)
    .filter(url => url !== undefined) as string[]

  return (
    <div className="space-y-4">
      {/* Global Tab Control */}
      <div className="sticky top-0 bg-background z-10 pb-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="pae">PAE Plot</TabsTrigger>
            <TabsTrigger value="plddt">pLDDT Plot</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === 'structure' && (
            <div>
              {cifUrls.length > 0 ? (
                <div className="flex justify-center">
                  <NglViewer urls={cifUrls} axis="x" spacing={50} tasks={sortedTasks}/>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  No structure available
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'pae' && (
            <div className="overflow-x-auto">
              <div className="flex gap-4 min-w-max">
                {tasks.map((task) => {
                  const images = taskImages.get(task.id)
                  return (
                    <div key={task.id} className="flex-shrink-0 w-80 space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Task #{task.task_order}</div>
                      <div>
                        {images?.pae ? (
                          <Image
                            src={images.pae}
                            alt="PAE Plot"
                            width={320}
                            height={192}
                            className="w-full h-auto max-h-48 object-contain"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-48 text-muted-foreground">
                            No PAE plot available
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {activeTab === 'plddt' && (
            <div className="overflow-x-auto">
              <div className="flex gap-4 min-w-max">
                {tasks.map((task) => {
                  const images = taskImages.get(task.id)
                  return (
                    <div key={task.id} className="flex-shrink-0 w-80 space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Task #{task.task_order}</div>
                      <div>
                        {images?.plddt ? (
                          <Image
                            src={images.plddt}
                            alt="pLDDT Plot"
                            width={320}
                            height={192}
                            className="w-full h-auto max-h-48 object-contain"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-48 text-muted-foreground">
                            No pLDDT plot available
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 