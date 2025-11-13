'use client'

import { ClockIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { ArrowUpDown, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

import WorkflowHistory from '../tasks/workflow-history'

dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('UTC')

type DesignJob = {
  id: string
  input_yaml_filename: string
  budget: number
  protocol_name: string
  num_designs: number
  status: string
  created_at: string
  updated_at: string
  pipeline_name: string
  operating_mode?: string
  run_time_in_seconds?: number
}

// Type for table display (mapped from API response)
type Pipeline = {
  pipeline_id: string
  name: string
  status: string
  updated_at: string
  created_at: string
  description?: string
  protocol_name?: string
  num_designs?: number
  budget?: number
  operating_mode?: string
  run_time_in_seconds?: number
}

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [totalPipelines, setTotalPipelines] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()


  const fetchPipelineList = useCallback(async (skip: number = 0, limit: number = 5): Promise<{data: Pipeline[], total: number}> => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    try {
      const response = await fetch(
        `${API_URL}/v1/design/list?skip=${skip}&limit=${limit}`,
        {
          credentials: 'include'
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch design jobs')
      }
      
      const data = await response.json()
      
      // The API returns {message, count, jobs}
      const jobs: DesignJob[] = data.jobs || []
      const total = data.count || 0
      
      // Map API response to table format
      const pipelines: Pipeline[] = jobs.map((job: DesignJob) => ({
        pipeline_id: job.id,
        name: job.pipeline_name || job.input_yaml_filename,
        status: job.status.toUpperCase(),
        created_at: job.created_at,
        updated_at: job.updated_at,
        description: `${job.protocol_name} - ${job.num_designs} designs - Budget: ${job.budget}`,
        protocol_name: job.protocol_name,
        num_designs: job.num_designs,
        budget: job.budget,
        operating_mode: job.operating_mode,
        run_time_in_seconds: job.run_time_in_seconds
      }))
      
      return {
        data: pipelines,
        total: total
      }
    } catch (error) {
      console.error('Error fetching design jobs:', error)
      // Return empty data on error - toast will be shown in refreshPipelines
      return {
        data: [],
        total: 0
      }
    }
  }, [])

  const refreshPipelines = useCallback(async (page: number = 0, size: number = 5) => {
    setIsLoading(true)
    try {
      const skip = page * size
      const response = await fetchPipelineList(skip, size)
      setPipelines(response.data)
      setTotalPipelines(response.total)
      setCurrentPage(page)
      setPageSize(size)
    } catch (error) {
      console.error('Error fetching pipelines:', error)
      toast({
        title: "Error",
        description: `Failed to fetch design jobs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [fetchPipelineList, toast])

  useEffect(() => {
    refreshPipelines(0, 10) // Initial load with first page and 10 items per page
  }, [refreshPipelines])

  const handleRowClick = (pipeline: Pipeline) => {
    router.push(`/jobs/${pipeline.pipeline_id}`)
  }

  const statusColors: { [key: string]: string } = {
    running: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    pending: 'bg-gray-500'
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
      accessorKey: 'protocol_name',
      header: 'Protocol',
      cell: ({ row }) => {
        const protocol = row.getValue('protocol_name') as string
        return (
          <span className="text-sm">
            {protocol || 'N/A'}
          </span>
        )
      }
    },
    {
      accessorKey: 'operating_mode',
      header: 'Operating Mode',
      cell: ({ row }) => {
        const mode = row.getValue('operating_mode') as string
        return (
          <span className="text-sm">
            {mode || 'N/A'}
          </span>
        )
      }
    },
    {
      accessorKey: 'run_time_in_seconds',
      header: 'Runtime',
      cell: ({ row }) => {
        const secs = row.getValue('run_time_in_seconds') as number | undefined
        const humanize = (total: number | undefined) => {
          if (total == null || isNaN(total)) return 'N/A'
          const h = Math.floor(total / 3600)
          const m = Math.floor((total % 3600) / 60)
          const s = total % 60
          if (h > 0) return `${h}h ${m}m`
          if (m > 0) return `${m}m ${s}s`
          return `${s}s`
        }
        return (
          <span className="text-sm">
            {humanize(secs)}
          </span>
        )
      }
    },
    {
      accessorKey: 'num_designs',
      header: 'Number of Designs',
      cell: ({ row }) => {
        const numDesigns = row.getValue('num_designs') as number
        return (
          <span className="text-sm">
            {numDesigns ?? 'N/A'}
          </span>
        )
      }
    },
    {
      accessorKey: 'budget',
      header: 'Budget',
      cell: ({ row }) => {
        const budget = row.getValue('budget') as number
        return (
          <span className="text-sm">
            {budget ?? 'N/A'}
          </span>
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
    <div className="h-full flex flex-col overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="[&_table]:border-none [&_th]:border-none [&_td]:border-none flex-1 flex flex-col min-h-0 overflow-hidden">
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
