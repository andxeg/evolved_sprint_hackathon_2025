'use client'

import { ClockIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { ArrowUpDown, ChevronDown, GitFork, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

import WorkflowHistory from '../tasks/workflow-history'

dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('UTC')

type Pipeline = {
  pipeline_id: string
  name: string
  status: string
  updated_at: string
  created_at: string
  description?: string
}

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [totalPipelines, setTotalPipelines] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [websocketConnections, setWebsocketConnections] = useState<Map<string, WebSocket>>(new Map())
  const isMountedRef = React.useRef(true)
  const router = useRouter()
  const { toast: _toast } = useToast()

  // WebSocket connection management
  const createWebSocketConnection = useCallback((pipelineId: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL
    if (!API_URL) return

    // Check if connection already exists
    if (websocketConnections.has(pipelineId)) {
      return
    }

    let wsUrl = API_URL
    // Convert HTTP/HTTPS to WS/WSS
    if (API_URL.includes('http')) {
      wsUrl = API_URL.replace('http', 'ws')
    }
    if (API_URL.includes('https')) {
      wsUrl = API_URL.replace('https', 'wss')
    }

    const ws = new WebSocket(`${wsUrl}/v1/pipelines/status/live/pipeline-status/${pipelineId}`)
    
    // Add connection to map immediately to track it
    setWebsocketConnections(prev => new Map(prev).set(pipelineId, ws))
    
    // Add connection timeout
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.warn(`WebSocket connection timeout for pipeline ${pipelineId}, closing connection`)
        ws.close()
      }
    }, 10000) // 10 second timeout
    
    ws.onopen = () => {
      clearTimeout(connectionTimeout)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        // Handle different possible message structures
        let newStatus = data.status || data.state || data
        
        // If the message is just a string (like "RUNNING", "PENDING", etc.)
        if (typeof data === 'string') {
          newStatus = data
        }

        // Update the pipeline status in the pipelines array
        setPipelines(prevPipelines => {
          const updatedPipelines = prevPipelines.map(pipeline => 
            pipeline.pipeline_id === pipelineId 
              ? { ...pipeline, status: newStatus, updated_at: new Date().toISOString() }
              : pipeline
          )
          return updatedPipelines
        })

        // If status is COMPLETED, disconnect the WebSocket
        if (newStatus === 'COMPLETED') {
          try {
            if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
              ws.close(1000, 'Pipeline completed')
            }
          } catch (error) {
            console.warn(`Error closing WebSocket for completed pipeline ${pipelineId}:`, error)
          }
          setWebsocketConnections(prev => {
            const newMap = new Map(prev)
            newMap.delete(pipelineId)
            return newMap
          })
        }
      } catch (error) {
        console.error(`Error parsing WebSocket message for pipeline ${pipelineId}:`, error)
      }
    }

    ws.onerror = (error) => {
      if (process.env.NODE_ENV === 'production' || !String(error).includes('closed before the connection is established')) {
        console.error(`WebSocket error for pipeline ${pipelineId}:`, error)
      }
      clearTimeout(connectionTimeout)
    }

    ws.onclose = () => {
      clearTimeout(connectionTimeout)
      setWebsocketConnections(prev => {
        const newMap = new Map(prev)
        newMap.delete(pipelineId)
        return newMap
      })
    }
  }, [websocketConnections])

  const _disconnectWebSocket = useCallback((pipelineId: string) => {
    setWebsocketConnections(prev => {
      const ws = prev.get(pipelineId)
      if (ws) {
        try {
          if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Manual disconnect')
          }
        } catch (error) {
          console.warn(`Error closing WebSocket for pipeline ${pipelineId}:`, error)
        }
        const newMap = new Map(prev)
        newMap.delete(pipelineId)
        return newMap
      }
      return prev
    })
  }, [])

  // Mock data for pipelines - wrapped in useMemo to prevent re-creation
  const mockPipelines = useMemo((): Pipeline[] => [
  ], [])

  const fetchPipelineList = useCallback(async (skip: number = 0, limit: number = 5): Promise<{data: Pipeline[], total: number}> => {
    // For now, return mock data instead of API call
    const startIndex = skip
    const endIndex = skip + limit
    const paginatedPipelines = mockPipelines.slice(startIndex, endIndex)
    
    return {
      data: paginatedPipelines.map((pipeline: Pipeline) => ({
        ...pipeline,
        created_at: new Date(pipeline.created_at).toLocaleString(),
        updated_at: new Date(pipeline.updated_at).toISOString()
      })),
      total: mockPipelines.length
    }

    // Original API call (commented out for now)
    /*
    const API_URL = process.env.NEXT_PUBLIC_API_URL
    const response = await fetch(
      `${API_URL}/v1/pipelines?skip=${skip}&limit=${limit}`,
      {
        credentials: 'include'
      }
    )
    if (!response.ok) {
      throw new Error('Failed to fetch pipelines')
    }
    const data = await response.json()
    
    // The API returns {data: Array, count: number}
    const pipelines = data.data || []
    const total = data.count || 0
    
    return {
      data: pipelines.map((pipeline: any) => ({
        ...pipeline,
        created_at: new Date(pipeline.created_at).toLocaleString()
      })),
      total: total
    }
    */
  }, [mockPipelines])

  const refreshPipelines = useCallback(async (page: number = 0, size: number = 5) => {
    setIsLoading(true)
    try {
      const skip = page * size
      const response = await fetchPipelineList(skip, size)
      setPipelines(response.data)
      setTotalPipelines(response.total)
      setCurrentPage(page)
      setPageSize(size)

      // Set up WebSocket connections for non-completed pipelines
      response.data.forEach((pipeline: Pipeline) => {
        if (pipeline.status !== 'COMPLETED' && !websocketConnections.has(pipeline.pipeline_id)) {
          createWebSocketConnection(pipeline.pipeline_id)
        }
      })
    } catch (error) {
      console.error('Error fetching pipelines:', error)
    } finally {
      setIsLoading(false)
    }
  }, [createWebSocketConnection, websocketConnections, fetchPipelineList])

  useEffect(() => {
    refreshPipelines(0, 10) // Initial load with first page and 10 items per page
  }, [refreshPipelines]) // Include refreshPipelines dependency

  // Cleanup WebSocket connections on component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      websocketConnections.forEach((ws, pipelineId) => {
        try {
          if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Component unmounting')
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'production' || !String(error).includes('closed before the connection is established')) {
            console.warn(`Error closing WebSocket for pipeline ${pipelineId}:`, error)
          }
        }
      })
    }
  }, [websocketConnections]) // Include websocketConnections dependency

  const handleRowClick = (pipeline: Pipeline) => {
    router.push(`/pipelines/new/${pipeline.pipeline_id}`)
  }

  const statusColors: { [key: string]: string } = {
    running: 'bg-blue-800',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    pending: 'bg-yellow-500'
  }

  const toCamelCase = (str: string) => {
    if (str == null) return 'pending'
    return str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
  }

  const columns: ColumnDef<Pipeline>[] = [
    {
      accessorKey: 'name',
      header: 'Pipeline Name',
      cell: ({ row }) => {
        const name = row.getValue('name') as string

        return (
          <span className="font-medium" title={name}>
            {name}
          </span>
        )
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const currentStatus = row.original.status
        const camelCaseStatus = toCamelCase(currentStatus)
        const colorClass =
          statusColors[camelCaseStatus.toLowerCase()] || 'bg-gray-500'

        return (
          <div className="flex items-center">
            <Badge className={`${colorClass} text-white`}>
              {currentStatus === 'RUNNING' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {camelCaseStatus}
            </Badge>
          </div>
        )
      }
    },
    {
      accessorKey: 'updated_at',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Last Updated
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const utcDate = row.getValue('updated_at') as string
        if (utcDate) {
          return (
            <p className="flex items-center text-sm text-gray-500">
              <ClockIcon className="mr-2 h-3 w-3" />{' '}
              {dayjs.tz(utcDate).fromNow()}
            </p>
          )
        }
        return <div>N/A</div>
      }
    }
  ]

  return (
    <div className="h-full flex-col">
      <div className="p-4">
        <div className="[&_table]:border-none [&_th]:border-none [&_td]:border-none">
          <WorkflowHistory
            columns={columns}
            data={pipelines}
            onRowClick={handleRowClick}
            onJobUpdate={() => refreshPipelines(currentPage, pageSize)}
            fetchJobs={refreshPipelines}
            totalItems={totalPipelines}
            currentPage={currentPage}
            pageSize={pageSize}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
