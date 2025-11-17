'use client'

import {
  type ColorMode,
  Connection,
  ConnectionLineType,
  Controls,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  ReactFlow,
} from '@xyflow/react'
import React from 'react'

// Import extracted components and utilities
import { nodeTypes } from '../../components/ModelNode'

interface OverviewTabProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (params: Connection) => void
  onNodeClick: (event: React.MouseEvent, node: Node) => void
  colorMode: ColorMode
}

function FlowContent({ colorMode }: { colorMode: ColorMode }) {
  return (
    <>
      <Controls />
    </>
  )
}

export function OverviewTab({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  colorMode
}: OverviewTabProps) {
  const instanceRef = React.useRef<any>(null)

  // Center and fit the view on init, on data changes, and on resize
  const fitToView = React.useCallback(() => {
    const inst = instanceRef.current
    try {
      // Fit all nodes nicely within the viewport
      inst?.fitView?.({ padding: 0.2, includeHiddenNodes: true })
    } catch {}
  }, [])

  React.useEffect(() => {
    fitToView()
    // Re-fit shortly after to account for layout reflows
    const id = setTimeout(fitToView, 50)
    return () => clearTimeout(id)
  }, [nodes, edges, fitToView])

  React.useEffect(() => {
    const onResize = () => fitToView()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [fitToView])

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      {/* Main Flow Area */}
      <div className="h-full w-full overflow-hidden">
        <ReactFlow
          className="bg-background"
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          onInit={(instance) => {
            instanceRef.current = instance
            fitToView()
          }}
          minZoom={0.3}
          maxZoom={2}
          colorMode={colorMode}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
          panOnScroll={true}
        >
          <FlowContent colorMode={colorMode} />
        </ReactFlow>
      </div>
    </div>
  )
}
