'use client'

import {
  Background,
  BackgroundVariant,
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
import { nodeTypes } from '../../../components/ModelNode'

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
      <Background 
        variant={BackgroundVariant.Dots} 
        gap={12} 
        size={1}
        color={colorMode === 'dark' ? '#374151' : '#e5e7eb'}
      />
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
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      {/* Main Flow Area */}
      <div className="h-full w-full overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultViewport={{ x: 50, y: 290, zoom: 1.2 }}
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
