import dagre from '@dagrejs/dagre'
import { Edge, Node, Position } from '@xyflow/react'

// Dagre layout configuration
const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
const nodeWidth = 250
const nodeHeight = 60

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const isHorizontal = direction === 'LR'
  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: isHorizontal ? 120 : 80, // Spacing between ranks (horizontal: vertical spacing, vertical: horizontal spacing)
    nodesep: isHorizontal ? 100 : 60, // Spacing between nodes (horizontal: vertical spacing, vertical: horizontal spacing)
    edgesep: 25, // Edge separation
    marginx: 100, // Horizontal margin
    marginy: 50  // Vertical margin
  })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  // Calculate the center offset to better center the layout
  const allNodes = nodes.map(node => dagreGraph.node(node.id))
  const minX = Math.min(...allNodes.map(n => n.x))
  const maxX = Math.max(...allNodes.map(n => n.x))
  const centerOffset = (maxX - minX) / 2 - (maxX + minX) / 2

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - nodeWidth / 2 - centerOffset,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    }

    return newNode
  })

  return { nodes: newNodes, edges }
}
