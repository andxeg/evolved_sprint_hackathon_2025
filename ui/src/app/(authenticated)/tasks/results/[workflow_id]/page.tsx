'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'

import { MarkdownContent } from '@/components/ui/markdown-content'
import { useToast } from '@/hooks/use-toast'

import { GeneratedSequencesTable } from './components/GeneratedSequencesTable'
import { PeptideMetricsGrid } from './components/PeptideMetricsGrid'
import { ResultsBreadcrumb } from './components/ResultsBreadcrumb'
import { SequenceCard } from './components/SequenceCard'
import { WorkflowStatusControls } from './components/WorkflowStatusControls'
import { useWorkflowResults } from './hooks/useWorkflowResults'

const chunkSize = 10

const formatSequenceMarkup = (sequence: string) => {
  const chunks = sequence.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || []
  return chunks
    .map(
      (chunk, index) => `
      <span class="inline-block mr-4 mb-2">
        <span class="block text-xs text-gray-500 h-4">
          ${
            index === chunks.length - 1
              ? sequence.length.toString().padStart(2, ' ')
              : ((index + 1) * chunkSize).toString().padStart(2, ' ')
          }
        </span>
        <span class="block">${chunk}</span>
      </span>
    `
    )
    .join('')
}

export default function WorkflowResultsPage() {
  const { workflow_id } = useParams<{ workflow_id: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const {
    status,
    isLoading,
    content,
    isStreaming,
    restartStreaming,
    workflowData,
    sequence,
    sequenceData,
    peptideMetrics,
    formattedUpdatedAt
  } = useWorkflowResults(workflow_id)

  const handleCopy = useCallback(
    (value: string) => {
      navigator.clipboard.writeText(value).then(
        () => {
          toast({
            title: 'Sequence copied',
            description: 'The sequence has been copied to your clipboard.'
          })
        },
        error => {
          console.error('Could not copy text:', error)
        }
      )
    },
    [toast]
  )

  const rootPath = workflowData?.workflow_type === 'peptide_drug_discovery' ? '/properties' : '/design'
  const isPeptideWorkflow = workflowData?.workflow_type === 'peptide_drug_discovery'
  const isGenerationWorkflow = workflowData?.workflow_type === 'denovo_sequence_generation'

  return (
    <div className="w-full p-4">
      <ResultsBreadcrumb
        workflowType={workflowData?.workflow_type}
        rootPath={rootPath}
        onNavigate={router.push}
      />

      <p className="flex items-center text-sm text-gray-500">
        <span className="mr-2">Last updated</span>
        {formattedUpdatedAt}
      </p>

      {isPeptideWorkflow && <h1 className="mb-4 text-4xl font-bold">Properties prediction</h1>}
      {isGenerationWorkflow && <h1 className="mb-4 text-4xl font-bold">Generation Results</h1>}

      <WorkflowStatusControls
        status={status}
        isStreaming={isStreaming}
        isLoading={isLoading}
        onRestart={restartStreaming}
      />

      {content && (
        <div className="min-h-[200px] w-full overflow-y-auto rounded-md border p-4">
          {status === 'COMPLETED' && isPeptideWorkflow && (
            <>
              <div className="mb-4 text-2xl font-bold">Key Metrics</div>
              <PeptideMetricsGrid metrics={peptideMetrics} />
              <SequenceCard sequence={sequence} onCopy={handleCopy} formatSequence={formatSequenceMarkup} />
            </>
          )}

          {status === 'COMPLETED' && isGenerationWorkflow && (
            <>
              <div className="mb-4 text-2xl font-bold">Protein Description</div>
              <p>{sequence}</p>
              <GeneratedSequencesTable sequences={sequenceData} formatSequence={formatSequenceMarkup} onCopy={handleCopy} />
            </>
          )}

          <MarkdownContent id="workflow-results" content={content} />
        </div>
      )}
    </div>
  )
}
