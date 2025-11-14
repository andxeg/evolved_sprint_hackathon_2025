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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

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

// Dynamically import YAML viewer with SSR disabled
const YamlViewer = dynamic(
  () => import('./components/YamlViewer'),
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

type JobDetail = {
  id: string
  input_yaml_filename: string
  budget: number
  protocol_name: string
  num_designs: number
  status: string
  pipeline_name: string
  operating_mode?: string
  run_time_in_seconds?: number
  parent_design_job_id?: string | null
  is_child_design_job?: boolean | null
  created_at: string
  updated_at: string
}

type DesignResultsResponse = {
  message: string
  job: JobDetail
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
  const [columnSizing, setColumnSizing] = useState<Record<string, number | undefined>>({})
  const [columnSizingInfo, setColumnSizingInfo] = useState<any>({})
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  const [isLoadingCsv, setIsLoadingCsv] = useState(false)
  const [yamlContent, setYamlContent] = useState<string | null>(null)
  const [isLoadingYaml, setIsLoadingYaml] = useState(false)
  const [yamlError, setYamlError] = useState<string | null>(null)
  const [topRankSummary, setTopRankSummary] = useState<Record<string, string> | null>(null)

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

  const getFileType = (filename: string): 'cif' | 'pdf' | 'csv' | 'yaml' | 'image' | 'other' => {
    const ext = getFileExtension(filename)
    if (ext === 'cif') return 'cif'
    if (ext === 'pdf') return 'pdf'
    if (ext === 'csv') return 'csv'
    if (ext === 'yaml' || ext === 'yml') return 'yaml'
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg'].includes(ext)) return 'image'
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
          size: 180, // default width so all columns start uniform
          cell: ({ row }) => {
            // Access data directly from row.original to avoid column ID lookup issues
            const value = row.original[header]
            return <span className="text-sm">{String(value || '')}</span>
          },
        }
      })
      
      setCsvColumns(columns)
      // Initialize visibility: show first 7 columns by default
      const visibilityInit: Record<string, boolean> = {}
      const ids = columns.map(c => (c.id as string) || '')
      const visibleCount = Math.min(7, ids.length)
      ids.forEach((id, index) => {
        if (id) visibilityInit[id] = index < visibleCount
      })
      setColumnVisibility(visibilityInit)
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

  // Load top-rank summary from final_designs_metrics_2.csv (first row)
  useEffect(() => {
    const loadTopRank = async () => {
      if (!results || !results.files?.length) return
      // Match any file like final_designs_metrics_*.csv (e.g., final_designs_metrics_2.csv)
      const csvFile = results.files.find(f => /^final_designs_metrics_.*\.csv$/i.test(f.name))
      if (!csvFile) {
        setTopRankSummary(null)
        return
      }
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}${csvFile.url}`, { credentials: 'include' })
        if (!response.ok) throw new Error('Failed to fetch top-rank CSV')
        const csvText = await response.text()
        const { headers, rows } = parseCSV(csvText)
        if (rows.length === 0) {
          setTopRankSummary(null)
          return
        }
        const first = rows[0] || {}
        const summary: Record<string, string> = {
          design_to_target_iptm: String(first['design_to_target_iptm'] ?? ''),
          design_ptm: String(first['design_ptm'] ?? ''),
          target_ptm: String(first['target_ptm'] ?? ''),
          quality_score: String(first['quality_score'] ?? ''),
        }
        setTopRankSummary(summary)
      } catch (e) {
        // Non-fatal: just skip summary
        setTopRankSummary(null)
      }
    }
    loadTopRank()
  }, [results])

  const fetchYamlData = async (fileUrl: string) => {
    setIsLoadingYaml(true)
    setYamlError(null)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}${fileUrl}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch YAML file: ${response.statusText}`)
      }

      const yamlText = await response.text()
      setYamlContent(yamlText)
    } catch (error) {
      console.error('Error fetching YAML:', error)
      setYamlError(`Failed to load YAML file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setYamlContent(null)
      toast({
        title: 'Error',
        description: `Failed to load YAML file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoadingYaml(false)
    }
  }

  const handleFileClick = async (file: DesignResultFile) => {
    setSelectedFile(file)
    setShowFileViewer(true)
    
    // Reset states
    setCsvData([])
    setCsvColumns([])
    setYamlContent(null)
    setYamlError(null)
    
    const fileType = getFileType(file.name)
    
    // Fetch file content based on type
    if (fileType === 'csv') {
      await fetchCsvData(file.url)
    } else if (fileType === 'yaml') {
      await fetchYamlData(file.url)
    }
  }

  const getPdfUrl = (fileUrl: string): string => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return `${apiUrl}${fileUrl}`
  }

  const getCifViewerUrl = (fileUrl: string): string => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const fullUrl = `${apiUrl}${fileUrl}`
    return `https://nano-protein-viewer-react.juliocesar.io/?from=remote_url&url=${encodeURIComponent(fullUrl)}&color=chain`
  }

  // Create table instance for CSV data
  const csvTable = useReactTable({
    data: csvData,
    columns: csvColumns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
    onColumnSizingChange: setColumnSizing,
    onColumnSizingInfoChange: setColumnSizingInfo,
    state: {
      columnSizing,
      columnSizingInfo,
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
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
    <ScrollArea className="h-screen w-full">
      <div className="container mx-auto p-6 max-w-7xl pb-24">
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
        <h1 className="text-3xl font-bold">{results.job?.pipeline_name || 'Job Results'}</h1>
        {/* Embed + Top-rank summary side by side */}
        {(() => {
          const rank1 = results.files.find(f => /^rank0*1_.*\.cif$/i.test(f.name))
          if (!rank1) return null
          return (
            <div className="mt-4 flex gap-4">
              {/* 80% viewer */}
              <div className="w-4/5 h-[640px] border rounded-lg overflow-hidden">
                <iframe
                  src={getCifViewerUrl(rank1.url)}
                  className="w-full h-full border-0 rounded-lg"
                  title="Rank 1 Design Viewer"
                  allowFullScreen
                />
              </div>
              {/* 20% summary list */}
              <div className="w-1/5 h-[640px] border rounded-lg p-0">
                <div className="px-3 py-2 border-b">
                  <h3 className="text-base font-semibold">Rank 1 Metrics</h3>
                </div>
                <ScrollArea className="h-[600px]">
                  {topRankSummary ? (
                    <div className="divide-y">
                      <div className="flex items-center justify-between px-3 py-3">
                        <div className="text-sm font-semibold text-foreground pr-2">design_to_target_iptm</div>
                        <div className="text-sm text-right">{topRankSummary.design_to_target_iptm}</div>
                      </div>
                      <div className="flex items-center justify-between px-3 py-3">
                        <div className="text-sm font-semibold text-foreground pr-2">design_ptm</div>
                        <div className="text-sm text-right">{topRankSummary.design_ptm}</div>
                      </div>
                      <div className="flex items-center justify-between px-3 py-3">
                        <div className="text-sm font-semibold text-foreground pr-2">target_ptm</div>
                        <div className="text-sm text-right">{topRankSummary.target_ptm}</div>
                      </div>
                      <div className="flex items-center justify-between px-3 py-3">
                        <div className="text-sm font-semibold text-foreground pr-2">quality_score</div>
                        <div className="text-sm text-right">{topRankSummary.quality_score}</div>
                      </div>
                      <div className="h-6" />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground px-3 py-3">No summary available.</p>
                  )}
                </ScrollArea>
              </div>
            </div>
          )
        })()}
        <div className="mt-3">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Status</TableCell>
                <TableCell>{results.job?.status?.toUpperCase() || 'N/A'}</TableCell>
                <TableCell className="font-medium">Mode</TableCell>
                <TableCell>{results.job?.operating_mode || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Protocol</TableCell>
                <TableCell>{results.job?.protocol_name || 'N/A'}</TableCell>
                <TableCell className="font-medium">Runtime</TableCell>
                <TableCell>
                  {(() => {
                    const total = results.job?.run_time_in_seconds
                    if (total == null || isNaN(total)) return 'N/A'
                    const h = Math.floor(total / 3600)
                    const m = Math.floor((total % 3600) / 60)
                    const s = total % 60
                    if (h > 0) return `${h}h ${m}m`
                    if (m > 0) return `${m}m ${s}s`
                    return `${s}s`
                  })()}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Designs</TableCell>
                <TableCell>{results.job?.num_designs ?? 'N/A'}</TableCell>
                <TableCell className="font-medium">Budget</TableCell>
                <TableCell>{results.job?.budget ?? 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Created</TableCell>
                <TableCell>{results.job?.created_at || 'N/A'}</TableCell>
                <TableCell className="font-medium">Updated</TableCell>
                <TableCell>{results.job?.updated_at || 'N/A'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground mt-2">
            {results.count} file{results.count !== 1 ? 's' : ''} available
          </p>
          {/* Binder Optimization Selectivity Dashboard */}
          {results.job?.operating_mode === 'BINDER_OPTIMIZATION' && (() => {
            const dash = results.files.find(f => /selectivity_dashboard\.png$/i.test(f.name))
            if (!dash) return null
            return (
              <div className="mt-6">
                <h3 className="text-base font-semibold mb-2">Selectivity Dashboard</h3>
                <div className="w-full border rounded-lg overflow-hidden">
                  <img
                    src={getPdfUrl(dash.url)}
                    alt="Selectivity Dashboard"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>
            )
          })()}
        </div>
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
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={getPdfUrl(file.url)}
                      download
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Download ${file.name}`}
                    >
                      Download
                    </a>
                  </Button>
                </div>
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
                        {/* CSV toolbar */}
                        <div className="flex items-center justify-between p-2 border-b">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                {(() => {
                                  const all = csvTable.getAllLeafColumns().length
                                  const vis = csvTable.getAllLeafColumns().filter(c => c.getIsVisible()).length
                                  return `Columns (${vis}/${all})`
                                })()}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="max-h-80 overflow-auto">
                              {csvTable.getAllLeafColumns().map((col) => {
                                const id = col.id
                                const headerLabel = String(col.columnDef.header || id)
                                return (
                                  <DropdownMenuCheckboxItem
                                    key={id}
                                    checked={col.getIsVisible()}
                                    onCheckedChange={(value) => col.toggleVisibility(Boolean(value))}
                                    className="capitalize"
                                  >
                                    {headerLabel}
                                  </DropdownMenuCheckboxItem>
                                )
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Table className="table-fixed">
                          <TableHeader className="sticky top-0 bg-background z-10">
                            {csvTable.getHeaderGroups().map((headerGroup) => (
                              <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                  <TableHead
                                    key={header.id}
                                    style={{ width: header.getSize() }}
                                    className="relative border-r border-muted-foreground/20"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="truncate">
                                        {(header.isPlaceholder || !header.column.getIsVisible())
                                          ? null
                                          : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext()
                                            )}
                                      </div>
                                      {/* Resizer */}
                                      <div
                                        onMouseDown={header.getResizeHandler()}
                                        onTouchStart={header.getResizeHandler()}
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-muted-foreground/20 hover:bg-muted-foreground/50"
                                        role="separator"
                                        aria-orientation="vertical"
                                        aria-label={`Resize ${String(header.column.columnDef.header)}`}
                                      />
                                    </div>
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
                                  className="border-b border-muted-foreground/10"
                                >
                                  {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                      key={cell.id}
                                      style={{ width: cell.column.getSize() }}
                                      className="border-r border-muted-foreground/10"
                                    >
                                      <div className="truncate">
                                        {flexRender(
                                          cell.column.columnDef.cell,
                                          cell.getContext()
                                        )}
                                      </div>
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
                {getFileType(selectedFile.name) === 'image' && (
                  <div className="w-full h-full flex items-center justify-center bg-background">
                    <img
                      src={getPdfUrl(selectedFile.url)}
                      alt={selectedFile.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                {getFileType(selectedFile.name) === 'yaml' && (
                  <YamlViewer
                    fileUrl={selectedFile.url}
                    content={yamlContent}
                    isLoading={isLoadingYaml}
                    error={yamlError}
                  />
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
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  )
}

