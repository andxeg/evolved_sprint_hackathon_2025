
import standardDiagram from '@/app/(authenticated)/data/diagramData.json'
import binderDiagram from '@/app/(authenticated)/data/diagramData_binder.json'
import templatesData from '@/app/(authenticated)/data/templates.json'

// Pipeline diagram data mapping
export const getPipelineData = (pipelineId: string, operatingMode: 'standard' | 'binder-optimization' = 'standard') => {
  const pipeline = templatesData.find(p => p.id === pipelineId)
  
  if (!pipeline) {
    return null
  }

  // Select diagram based on operating mode
  const diagram = operatingMode === 'binder-optimization' ? binderDiagram : standardDiagram

  return {
    pipeline,
    diagram
  }
}
