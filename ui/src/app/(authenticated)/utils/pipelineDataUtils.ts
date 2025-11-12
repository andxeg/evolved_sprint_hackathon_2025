
import diagramData from '@/app/(authenticated)/data/diagramData.json'
import templatesData from '@/app/(authenticated)/data/templates.json'

// Pipeline diagram data mapping
export const getPipelineData = (pipelineId: string, operatingMode?: string) => {
  const pipeline = templatesData.find(p => p.id === pipelineId)
  
  if (!pipeline) {
    return null
  }

  // Determine diagram key based on operating mode
  let diagramKey: string
  if (operatingMode === 'binder-optimization') {
    diagramKey = 'binder-optimization'
  } else if (operatingMode === 'iterative-iptm') {
    diagramKey = 'iterative-iptm'
  } else {
    // Map boltzgen to mber diagram data (backward compatibility)
    diagramKey = pipelineId === 'boltzgen' ? 'mber' : pipelineId
  }

  return {
    pipeline,
    diagram: diagramData[diagramKey as keyof typeof diagramData] || diagramData.mber // fallback to mber
  }
}
