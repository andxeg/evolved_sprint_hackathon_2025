
import diagramData from '@/app/(authenticated)/data/diagramData.json'
import templatesData from '@/app/(authenticated)/data/templates.json'

// Pipeline diagram data mapping
export const getPipelineData = (pipelineId: string) => {
  const pipeline = templatesData.find(p => p.id === pipelineId)
  
  if (!pipeline) {
    return null
  }

  // With a single default diagram, return it directly
  return {
    pipeline,
    diagram: diagramData
  }
}
