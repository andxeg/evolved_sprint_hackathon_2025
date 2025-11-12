'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { FileText, Loader2, ArrowLeft } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import PDF viewer with SSR disabled to avoid DOMMatrix issues
const PdfViewer = dynamic(
  () => import('./components/PdfViewer'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
)

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
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvColumns, setCsvColumns] = useState<ColumnDef<any>[]>([])
  const [isLoadingCsv, setIsLoadingCsv] = useState(false)

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

  const parseCSV = (csvText: string): { headers: string[], rows: any[] } => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) return { headers: [], rows: [] }
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    
    // Parse rows
    const rows = lines.slice(1).map(line => {
      // Handle CSV with quoted values that may contain commas
      const values: string[] = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim()) // Add last value
      
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      return row
    })
    
    return { headers, rows }
  }

  const fetchCsvData = async (fileUrl: string) => {
    setIsLoadingCsv(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}${fileUrl}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch CSV file: ${response.statusText}`)
      }

      const csvText = await response.text()
      const { headers, rows } = parseCSV(csvText)
      
      // Dynamically create columns based on CSV headers
      // Sanitize column IDs to avoid issues with special characters
      const columns: ColumnDef<any>[] = headers.map((header, index) => {
        // Create a safe ID by replacing special characters
        const safeId = header.replace(/[<>]/g, '_').replace(/\s+/g, '_')
        return {
          id: safeId || `column_${index}`, // Explicit ID for TanStack Table
          accessorKey: header, // Keep original header for data access
          header: header,
          cell: ({ row }) => {
            // Access data directly from row.original to avoid column ID lookup issues
            const value = row.original[header]
            return <span className="text-sm">{String(value || '')}</span>
          },
        }
      })
      
      setCsvColumns(columns)
      setCsvData(rows)
    } catch (error) {
      console.error('Error fetching CSV:', error)
      toast({
        title: 'Error',
        description: `Failed to load CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
      setCsvData([])
      setCsvColumns([])
    } finally {
      setIsLoadingCsv(false)
    }
  }

  const handleFileClick = async (file: DesignResultFile) => {
    setSelectedFile(file)
    setShowFileViewer(true)
    
    // Reset states
    setCsvData([])
    setCsvColumns([])
    
    // If it's a CSV file, fetch and parse it
    if (getFileType(file.name) === 'csv') {
      await fetchCsvData(file.url)
    }
  }

  const getPdfUrl = (fileUrl: string): string => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return `${apiUrl}${fileUrl}`
  }

  const getCifViewerUrl = (fileUrl: string): string => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const fullUrl = `${apiUrl}${fileUrl}`
    return `https://nano-protein-viewer-react.juliocesar.io/?from=remote_url&url=${encodeURIComponent(fullUrl)}`
  }

  // Create table instance for CSV data
  const csvTable = useReactTable({
    data: csvData,
    columns: csvColumns,
    getCoreRowModel: getCoreRowModel(),
  })

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
            <DialogDescription className="sr-only">
              View file contents
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden flex flex-col">
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
                {getFileType(selectedFile.name) === 'csv' && (
                  <div className="w-full h-full flex flex-col overflow-hidden border rounded-lg bg-background">
                    {isLoadingCsv ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : csvData.length > 0 ? (
                      <div className="flex-1 overflow-auto">
                        <Table>
                          <TableHeader>
                            {csvTable.getHeaderGroups().map((headerGroup) => (
                              <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                  <TableHead key={header.id} className="sticky top-0 bg-background z-10">
                                    {header.isPlaceholder
                                      ? null
                                      : flexRender(
                                          header.column.columnDef.header,
                                          header.getContext()
                                        )}
                                  </TableHead>
                                ))}
                              </TableRow>
                            ))}
                          </TableHeader>
                          <TableBody>
                            {csvTable.getRowModel().rows?.length ? (
                              csvTable.getRowModel().rows.map((row) => (
                                <TableRow
                                  key={row.id}
                                  data-state={row.getIsSelected() && 'selected'}
                                >
                                  {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                      {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                      )}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={csvColumns.length}
                                  className="h-24 text-center"
                                >
                                  No results.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">
                          No data available
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {getFileType(selectedFile.name) === 'pdf' && (
                  <PdfViewer fileUrl={getPdfUrl(selectedFile.url)} />
                )}
                {getFileType(selectedFile.name) === 'other' && (
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

