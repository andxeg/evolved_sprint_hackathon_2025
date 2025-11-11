
import diagramData from '@/app/(authenticated)/data/diagramData.json'
import templatesData from '@/app/(authenticated)/data/templates.json'

// Pipeline diagram data mapping
export const getPipelineData = (pipelineId: string) => {
  const pipeline = templatesData.find(p => p.id === pipelineId)
  
  if (!pipeline) {
    return null
  }

  // Map boltzgen to mber diagram data (backward compatibility)
  const diagramKey = pipelineId === 'boltzgen' ? 'mber' : pipelineId

  return {
    pipeline,
    diagram: diagramData[diagramKey as keyof typeof diagramData] || diagramData.mber // fallback to mber
  }
}
