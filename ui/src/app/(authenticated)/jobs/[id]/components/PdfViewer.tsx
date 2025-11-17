'use client'

import { Button } from '@/components/ui/button'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set up the PDF.js worker - only runs in browser
// Use local worker file for better reliability
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

interface PdfViewerProps {
  fileUrl: string
}

export default function PdfViewer({ fileUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoadingPdf(false)
    setPdfError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error)
    setPdfError('Failed to load PDF file')
    setIsLoadingPdf(false)
  }

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages || 1, prev + 1))
  }

  // Reset page number when file URL changes
  useEffect(() => {
    setPageNumber(1)
    setNumPages(null)
    setPdfError(null)
  }, [fileUrl])

  return (
    <div className="w-full h-full flex flex-col border rounded-lg bg-background overflow-hidden">
      {isLoadingPdf && (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {pdfError && (
        <div className="flex items-center justify-center h-full">
          <p className="text-destructive">{pdfError}</p>
        </div>
      )}
      {!isLoadingPdf && !pdfError && (
        <>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/30">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
              onLoadStart={() => setIsLoadingPdf(true)}
              className="flex flex-col items-center"
            >
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
                width={typeof window !== 'undefined' ? Math.min(800, window.innerWidth * 0.85) : 800}
              />
            </Document>
          </div>
          {numPages && numPages > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pageNumber} of {numPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

