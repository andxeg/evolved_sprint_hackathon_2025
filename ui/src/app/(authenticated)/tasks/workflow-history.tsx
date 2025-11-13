'use client'

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon
} from '@radix-ui/react-icons'
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  Table as TableType,
  useReactTable} from '@tanstack/react-table'
import { RefreshCw } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

interface WorkflowHistoryProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (row: TData) => void
  onJobUpdate?: () => void
  fetchJobs: (page?: number, size?: number) => void
  totalItems?: number
  currentPage?: number
  pageSize?: number
  isLoading?: boolean
}

export function WorkflowHistory<TData, TValue>({
  columns,
  data,
  onRowClick,
  onJobUpdate: _onJobUpdate,
  fetchJobs,
  totalItems = 0,
  currentPage = 0,
  pageSize = 5,
  isLoading = false
}: WorkflowHistoryProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: currentPage,
    pageSize: pageSize
  })

  // Sync pagination state with props when they change
  React.useEffect(() => {
    setPagination({
      pageIndex: currentPage,
      pageSize: pageSize
    })
  }, [currentPage, pageSize])
  const { toast } = useToast()

  // Get appropriate message based on current path
  const getEmptyStateMessage = () => {
    return 'No results. Please start a new workflow.'
  }
  const enhancedColumns = React.useMemo(() => [
    ...columns
  ], [columns])

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // Enable server-side pagination
    pageCount: totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater
      setPagination(newPagination)
      // Fetch new data when pagination changes
      fetchJobs(newPagination.pageIndex, newPagination.pageSize)
    },
    autoResetPageIndex: false,
    state: {
      sorting,
      columnFilters,
      pagination
    }
  })

  const handleRefresh = () => {
    fetchJobs(currentPage, pageSize)
    toast({
      title: 'Refreshed',
      description: 'The workflow list has been refreshed.'
    })
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between py-4 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Select
            onValueChange={value =>
              table
                .getColumn('status')
                ?.setFilterValue(value === 'all' ? '' : value)
            }
            disabled={isLoading}
          >
            <SelectTrigger className="w-[180px]" disabled={isLoading}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center">
                  All
                </div>
              </SelectItem>
              <SelectItem value="COMPLETED">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  Completed
                </div>
              </SelectItem>
              <SelectItem value="PENDING">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-gray-400 mr-2"></div>
                  Pending
                </div>
              </SelectItem>
              <SelectItem value="INITIALIZED">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-gray-400 mr-2"></div>
                  Initialized
                </div>
              </SelectItem>
              <SelectItem value="RUNNING">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                  Running
                </div>
              </SelectItem>
              <SelectItem value="FAILED">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                  Failed
                </div>
              </SelectItem>
              <SelectItem value="STOPPED">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-gray-400 mr-2"></div>
                  Stopped
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
      <div className="rounded-md border flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id}>
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
              {isLoading ? (
                <>
                  {/* Show skeleton rows while loading */}
                  {Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      {Array.from({ length: columns.length }).map((_, cellIndex) => (
                        <TableCell key={`skeleton-cell-${cellIndex}`} className="py-4">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="cursor-pointer py-4 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() =>
                      onRowClick && onRowClick(row.original as TData)
                    }
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} className="py-4">
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
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {getEmptyStateMessage()}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex-shrink-0 pt-4">
        <DataTablePagination table={table} totalItems={totalItems} fetchJobs={fetchJobs} isLoading={isLoading} />
      </div>
    </div>
  )
}

function DataTablePagination<TData>({ table, totalItems, fetchJobs, isLoading = false }: { table: TableType<TData>, totalItems: number, fetchJobs: (page?: number, size?: number) => void, isLoading?: boolean }) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {isLoading ? 'Loading...' : `Showing ${table.getRowModel().rows.length} of ${totalItems} Rows`}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={value => {
              const newPageSize = Number(value)
              table.setPageSize(newPageSize)
              // Reset to first page when changing page size
              fetchJobs(0, newPageSize)
            }}
            disabled={isLoading}
          >
            <SelectTrigger className="h-8 w-[70px]" disabled={isLoading}>
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 30, 40, 50].map(pageSize => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage() || isLoading}
          >
            <span className="sr-only">Go to first page</span>
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage() || isLoading}
          >
            <span className="sr-only">Go to last page</span>
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default WorkflowHistory
