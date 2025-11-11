import { Handle, NodeTypes,Position } from '@xyflow/react'
import { 
  BarChart3,
  Braces,
  Brain,
  ChevronsLeftRightEllipsis,
  Cpu,
  Database,
  Dna,
  Microchip,
  Microscope,
  Play,
  Square,
  Target,
  Zap} from 'lucide-react'
import React from 'react'

// Custom Node Components
export const ModelNode = ({ data, selected, type }: { data: any; selected: boolean; type: string }) => {
  // Use the selected state from our custom logic instead of ReactFlow's internal selection
  const isSelected = data.selected || selected
  const _getIcon = (type: string) => {
    const icons: Record<string, any> = {
      'target-selection': Target,
      'model-load': Cpu,
      'sequence-generation': Dna,
      'affinity-prediction': BarChart3,
      'toxicity-prediction': Microscope,
      'immuno-prediction': Brain,
      'ranking': Zap,
      'synthesis': Database,
      'assay': Database,
      'analysis': Cpu,
      'structure-prediction': Cpu,
      'optimization': Zap,
      'validation': Microscope,
      'multi-objective': Brain,
    }
    const Icon = icons[type] || Target
    return <Icon className="w-6 h-6" />
  }

  const _getNodeTypeIcon = (nodeType: string) => {
    if (nodeType === 'input') {
      return <ChevronsLeftRightEllipsis className="w-4 h-4" />
    } else if (nodeType === 'model') {
      return <Microchip className="w-4 h-4" />
    } else if (nodeType === 'process') {
      return <Braces className="w-4 h-4" />
    } else if (nodeType === 'start') {
      return <Play className="w-4 h-4" />
    } else if (nodeType === 'end') {
      return <Square className="w-4 h-4" />
    }
    return null
  }

  const _getNodeTypeColor = (nodeType: string) => {
    if (nodeType === 'input') {
      return 'bg-blue-500'
    } else if (nodeType === 'model') {
      return 'bg-purple-500'
    } else if (nodeType === 'process') {
      return 'bg-green-500'
    } else if (nodeType === 'start') {
      return 'bg-emerald-500'
    } else if (nodeType === 'end') {
      return 'bg-red-500'
    }
    return 'bg-gray-500'
  }

  const _parseNodeLabel = (label: string) => {
    // Split label by colon to separate type and name
    const parts = label.split(':')
    if (parts.length === 2) {
      return {
        type: parts[0].trim(),
        name: parts[1].trim()
      }
    }
    return {
      type: '',
      name: label
    }
  }

  const _renderStyledLabel = (label: string) => {
    // Check if label starts with "Input:", "Model load:", or "Process:"
    if (label.startsWith('Input:')) {
      const prefix = label.substring(0, 6) // "Input:"
      const mainText = label.substring(6).trim() // Everything after "Input:"
      return (
        <span>
          <span className="text-gray-500 dark:text-gray-400">{prefix} </span>
          <span className="text-gray-900 dark:text-gray-100">{mainText}</span>
        </span>
      )
    } else if (label.startsWith('Model load:')) {
      const prefix = label.substring(0, 11) // "Model load:"
      const mainText = label.substring(11).trim() // Everything after "Model load:"
      return (
        <span>
          <span className="text-gray-500 dark:text-gray-400">{prefix} </span>
          <span className="text-gray-900 dark:text-gray-100">{mainText}</span>
        </span>
      )
    } else if (label.startsWith('Process:')) {
      const prefix = label.substring(0, 8) // "Process:"
      const mainText = label.substring(8).trim() // Everything after "Process:"
      return (
        <span>
          <span className="text-gray-500 dark:text-gray-400">{prefix} </span>
          <span className="text-gray-900 dark:text-gray-100">{mainText}</span>
        </span>
      )
    }
    
    // For other labels, return as is
    return label
  }

  const parsedLabel = _parseNodeLabel(data.label)
  const nodeTypeColor = _getNodeTypeColor(type)

  return (
    <div 
      className={`relative transition-all duration-200 rounded-lg border ${
        isSelected 
          ? 'bg-green-100 dark:bg-green-900/30 border-green-300' 
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
      style={{
        width: 'auto',
        minWidth: '200px',
        maxWidth: '350px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        textAlign: 'center'
      }}
    >
      {/* Source Handle - for outgoing connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="w-3 h-3 shadow-md"
        style={{ 
          background: '#3b82f6',
          border: '2px solid white',
        }}
      />
      
      {/* Target Handle - for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="w-3 h-3 shadow-md"
        style={{ 
          background: '#10b981',
          border: '2px solid white',
        }}
      />
      
      {/* Colored Icon Background */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${nodeTypeColor} flex items-center justify-center mr-3`}>
        {_getNodeTypeIcon(type)}
      </div>
      
      {/* Two-line Text Content */}
      <div className="flex-1 flex flex-col justify-center text-left">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
          {parsedLabel.name}
        </div>
        {parsedLabel.type && (
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
            {parsedLabel.type}
          </div>
        )}
      </div>
    </div>
  )
}

export const nodeTypes: NodeTypes = {
  model: ModelNode,
  input: ModelNode,
  process: ModelNode,
  start: ModelNode,
  end: ModelNode,
}
