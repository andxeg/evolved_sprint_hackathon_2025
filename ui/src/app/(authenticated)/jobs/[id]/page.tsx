'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { FileText, Loader2, ArrowLeft } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type DesignResultFile = {
  name: string
  path: string
  url: string
}

type DesignResultsResponse = {
  message: string
  job_id: string
  files: DesignResultFile[]
  count: number
}

export default function JobResultsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const jobId = params.id as string

  const [results, setResults] = useState<DesignResultsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<DesignResultFile | null>(null)
  const [showFileViewer, setShowFileViewer] = useState(false)

  const fetchJobResults = useCallback(async () => {
    if (!jobId) return
    
    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/v1/design/results/${jobId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch job results: ${response.statusText}`)
      }

      const data: DesignResultsResponse = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error fetching job results:', error)
      toast({
        title: 'Error',
        description: `Failed to fetch job results: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [jobId, toast])

  useEffect(() => {
    fetchJobResults()
  }, [fetchJobResults])

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const getFileType = (filename: string): 'cif' | 'pdf' | 'csv' | 'other' => {
    const ext = getFileExtension(filename)
    if (ext === 'cif') return 'cif'
    if (ext === 'pdf') return 'pdf'
    if (ext === 'csv') return 'csv'
    return 'other'
  }

  const handleFileClick = (file: DesignResultFile) => {
    setSelectedFile(file)
    setShowFileViewer(true)
  }

  const getCifViewerUrl = (fileUrl: string): string => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const fullUrl = `${apiUrl}${fileUrl}`
    return `https://nano-protein-viewer-react.juliocesar.io/?from=remote_url&url=${encodeURIComponent(fullUrl)}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">No results found for this job.</p>
        <Button onClick={() => router.push('/jobs')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={() => router.push('/jobs')}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
        <h1 className="text-3xl font-bold">Job Results</h1>
        <p className="text-muted-foreground mt-2">
          Job ID: {results.job_id}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {results.count} file{results.count !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results.files.map((file, index) => {
          const fileType = getFileType(file.name)
          return (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleFileClick(file)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground">
                    {getFileExtension(file.name).toUpperCase()}
                  </span>
                </div>
                <CardTitle className="text-sm mt-2 line-clamp-2">
                  {file.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs line-clamp-2">
                  {file.path}
                </CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* File Viewer Modal */}
      <Dialog open={showFileViewer} onOpenChange={setShowFileViewer}>
        <DialogContent className="max-w-[95vw] !max-w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle>
              {selectedFile?.name || 'File Viewer'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden">
            {selectedFile && (
              <>
                {getFileType(selectedFile.name) === 'cif' && (
                  <iframe
                    src={getCifViewerUrl(selectedFile.url)}
                    className="w-full h-full border-0 rounded-lg"
                    title="Protein Structure Viewer"
                    allowFullScreen
                  />
                )}
                {(getFileType(selectedFile.name) === 'pdf' ||
                  getFileType(selectedFile.name) === 'csv' ||
                  getFileType(selectedFile.name) === 'other') && (
                  <div className="w-full h-full flex items-center justify-center border rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">
                      Preview not available for {getFileExtension(selectedFile.name).toUpperCase()} files
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

