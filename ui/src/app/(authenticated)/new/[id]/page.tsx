'use client'

import '@xyflow/react/dist/style.css'
import './xyflow-theme.css'

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type ColorMode,
  Connection,
  ConnectionLineType,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
} from '@xyflow/react'
import { 
  ChevronDown,
  Settings2,
  X} from 'lucide-react'
import { useParams,useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

// Import extracted components and utilities
import { getLayoutedElements } from '../../utils/layoutUtils'
import { getPipelineData } from '../../utils/pipelineDataUtils'
import { OverviewTab } from './components/OverviewTab'
import { ParametersTab } from './components/ParametersTab'
// Import new components
import { PipelineHeader } from './components/PipelineHeader'
import PipelineJobConfig from './components/PipelineJobConfig'
import { DesignStepForm, type Entity } from './components/DesignStepForm'
import { fetchVHHConfig } from './utils/configLoader'
import { validateAndCleanYamlContent,validateYamlContent } from './utils/yaml-validator'



export default function PipelineEditorPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const pipelineId = params.id as string
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [pipelineData, setPipelineData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showJobConfig, setShowJobConfig] = useState(true)
  
  // Job configuration state
  const [pipelineName, setPipelineName] = useState('')
  const [editPipelineName, setEditPipelineName] = useState(true)
  const [gpuType, setGpuType] = useState('8x H100 Nebius')
  const [protocol, setProtocol] = useState('protein-anything')
  const [numDesigns, setNumDesigns] = useState('10')
  const [budget, setBudget] = useState('2')
  
  const [targetFormData, setTargetFormData] = useState({
    target_id: '',
    target_name: '',
    region: '',
    target_hotspot_residues: '',
    masked_binder_seq: ''
  })

  // Entities state for design step
  const [entities, setEntities] = useState<Entity[]>([])

  const yamlTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // YAML editor state - moved here to persist across tab switches
  const [vhhConfigYaml, setVhhConfigYaml] = useState<string>('')
  const [yamlHasChanges, setYamlHasChanges] = useState(false)
  const [yamlValidationResult, setYamlValidationResult] = useState<any>(null)
  const [yamlSaveMessage, setYamlSaveMessage] = useState<string | null>(null)
  const [yamlIsResetting, setYamlIsResetting] = useState(false)

  // CIF viewer modal state
  const [showCifViewer, setShowCifViewer] = useState(false)
  const [cifViewerUrl, setCifViewerUrl] = useState<string | null>(null)

  // Store validation payload for reuse in Start Workflow
  const [validationPayload, setValidationPayload] = useState<any>(null)

  // React Flow state
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  // React Flow colorMode - always dark
  const colorMode: ColorMode = 'dark'

  // Function to generate auto pipeline name
  const generatePipelineName = useCallback(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `Pipeline_Boltzgen_${year}-${month}-${day}_${hours}:${minutes}`
  }, [])


  // Disable body scroll when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  // Clear selected node when switching to parameters tab
  useEffect(() => {
    if (activeTab === 'parameters') {
      setSelectedNode(null)
    }
  }, [activeTab])

  // Load pipeline data based on URL parameter
  useEffect(() => {
    const data = getPipelineData(pipelineId)
    if (data) {
      setPipelineData(data)
      
      // Add start and end nodes
      const startNode = {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: {
          label: 'Start',
          type: 'start',
          description: 'Pipeline start point'
        }
      }
      
      const endNode = {
        id: 'end',
        type: 'end',
        position: { x: 0, y: 0 },
        data: {
          label: 'End',
          type: 'end',
          description: 'Pipeline end point'
        }
      }
      
      // Add start and end nodes to the beginning and end
      const nodesWithStartEnd = [startNode, ...data.diagram.nodes, endNode]
      
      // Add edges from start to first node and from last node to end
      const firstNodeId = data.diagram.nodes[0]?.id
      const lastNodeId = data.diagram.nodes[data.diagram.nodes.length - 1]?.id
      
      const edgesWithStartEnd = [
        ...data.diagram.edges,
        ...(firstNodeId ? [{ id: 'e-start-1', source: 'start', target: firstNodeId }] : []),
        ...(lastNodeId ? [{ id: `e-${lastNodeId}-end`, source: lastNodeId, target: 'end' }] : [])
      ]
      
      // Apply initial layout (horizontal by default)
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodesWithStartEnd,
        edgesWithStartEnd
      )
      setNodes(layoutedNodes)
      setEdges(layoutedEdges)
      
      // Auto-select the "[1] Design" node to open the form by default
      const designNode = layoutedNodes.find(node => node.data?.type === 'design')
      if (designNode) {
        setSelectedNode(designNode)
      }
    } else {
      // Redirect to pipelines page if pipeline not found
      router.push('/pipelines')
    }
  }, [pipelineId, router])

  // Initialize pipeline name when component mounts
  useEffect(() => {
    if (editPipelineName && !pipelineName) {
      setPipelineName(generatePipelineName())
    }
  }, [editPipelineName, pipelineName, generatePipelineName])


  // Initialize YAML configuration
  useEffect(() => {
    const loadYamlConfig = async () => {
      try {
        const config = await fetchVHHConfig()
        setVhhConfigYaml(config)
      } catch (err) {
        console.error('Failed to load VHH config:', err)
      }
    }
    loadYamlConfig()
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (yamlTimeoutRef.current) {
        clearTimeout(yamlTimeoutRef.current)
      }
    }
  }, [])


  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  )

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: ConnectionLineType.SmoothStep }, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  // Update nodes with selection state
  useEffect(() => {
    setNodes(prevNodes => 
      prevNodes.map(node => ({
        ...node,
        selected: selectedNode?.id === node.id
      }))
    )
  }, [selectedNode])

  const handleFormChange = (field: string, value: string) => {
    setTargetFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleModelChange = (modelValue: string) => {
    // Update the node data with the new model selection
    setNodes(prevNodes => 
      prevNodes.map(node => {
        if (node.id === selectedNode?.id && node.data?.type === "model-load") {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              model: modelValue,
              label: `Model load: ${modelValue}`,
              model_options: node.data.model_options // Preserve the model_options array
            }
          }
          
          // Update the selectedNode reference so the UI re-renders
          setSelectedNode(updatedNode)
          
          return updatedNode
        }
        return node
      })
    )

    // Update the YAML configuration based on which node is selected
    if (selectedNode?.id === "2") {
      updateYamlPlmModel(modelValue)
    } else if (selectedNode?.id === "3") {
      updateYamlFoldingModel(modelValue)
    }
  }

  const updateYamlFoldingModel = (modelValue: string) => {
    setVhhConfigYaml(prevYaml => {
      // Use regex to find and replace the folding_model value
      const regex = /folding_model:\s*["']([^"']*)["']/
      const replacement = `folding_model: "${modelValue}"`
      
      if (regex.test(prevYaml)) {
        return prevYaml.replace(regex, replacement)
      } else {
        // If not found, add it to the template_config section
        return prevYaml.replace(
          /(template_config:\s*\n)/,
          `$1  folding_model: "${modelValue}"\n`
        )
      }
    })
    setYamlHasChanges(true)
  }

  const updateYamlPlmModel = (modelValue: string) => {
    setVhhConfigYaml(prevYaml => {
      // Use regex to find and replace the plm_model value
      const regex = /plm_model:\s*["']([^"']*)["']/
      const replacement = `plm_model: "${modelValue}"`
      
      if (regex.test(prevYaml)) {
        return prevYaml.replace(regex, replacement)
      } else {
        // If not found, add it to the template_config section
        return prevYaml.replace(
          /(template_config:\s*\n)/,
          `$1  plm_model: "${modelValue}"\n`
        )
      }
    })
    setYamlHasChanges(true)
  }

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Target protein data:', targetFormData)
    // Here you would typically send the data to your API
  }

  const handleLoadExample = () => {
    setTargetFormData({
      target_id: 'Q9NZQ7',
      target_name: 'PDL1',
      region: 'A:18-132',
      target_hotspot_residues: 'A54,A56,A66,A115',
      masked_binder_seq: 'EVQLVESGGGLVQPGGSLRLSCAASG*********WFRQAPGKEREF***********NADSVKGRFTISRDNAKNTLYLQMNSLRAEDTAVYYC************WGQGTLVTVSS'
    })
  }

  const handleLoadExampleDesign = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      // Step 1: Fetch the CIF file from public folder
      const cifResponse = await fetch('/examples/5cqg.cif')
      if (!cifResponse.ok) {
        throw new Error('Failed to fetch example CIF file')
      }
      
      const cifBlob = await cifResponse.blob()
      const cifFile = new File([cifBlob], '5cqg.cif', { type: 'chemical/x-cif' })
      
      // Step 2: Upload CIF file to API
      const formData = new FormData()
      formData.append('file', cifFile)
      
      const uploadResponse = await fetch(`${apiUrl}/v1/upload`, {
        method: 'POST',
        body: formData,
      })
      
      if (!uploadResponse.ok) {
        throw new Error(`CIF upload failed: ${uploadResponse.statusText}`)
      }
      
      const uploadData = await uploadResponse.json()
      const uploadedFilename = uploadData.files?.[0]?.file_name || '5cqg.cif'
      
      // Step 3: Create entities based on example YAML structure
      const exampleEntities: Entity[] = [
        {
          type: 'protein',
          id: 'G',
          sequence: '12..20'
        },
        {
          type: 'file',
          path: uploadedFilename,
          uploadedFilename: uploadedFilename,
          uploadedFile: cifFile,
          include: [
            { id: 'A' }
          ],
          binding_types_chain: [
            { id: 'A', binding: '343,344,251' }
          ],
          structure_groups: 'all'
        }
      ]
      
      // Step 4: Update entities and YAML
      handleEntitiesChange(exampleEntities)
      
      toast({
        title: "Example loaded",
        description: "Example design loaded successfully!",
      })
    } catch (error) {
      console.error('Error loading example design:', error)
      toast({
        title: "Error",
        description: `Failed to load example: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }

  // Form validation function
  const isFormValid = () => {
    // Check if entities are defined (for design pipeline)
    if (entities.length > 0) {
      return entities.every(entity => {
        if (entity.type === 'protein') {
          return entity.id && entity.sequence
        } else if (entity.type === 'ligand') {
          return (entity.id || (entity.ids && entity.ids.length > 0)) && (entity.ccd || entity.smiles)
        } else if (entity.type === 'file') {
          // File is valid if it has path, uploadedFile, or uploadedFilename
          return entity.path || entity.uploadedFile || entity.uploadedFilename
        }
        return false
      })
    }
    // For other nodes, use old validation (if needed)
    return targetFormData.target_id.trim() !== '' &&
           targetFormData.target_name.trim() !== '' &&
           targetFormData.region.trim() !== '' &&
           targetFormData.target_hotspot_residues.trim() !== '' &&
           targetFormData.masked_binder_seq.trim() !== ''
  }

  // Build payload function (shared between validate and start)
  const buildPayload = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    // Generate a unique ID for this workflow run
    const workflowId = pipelineId || `workflow-${Date.now()}`
    
    // Step 1: Upload YAML content as a file
    const yamlContent = vhhConfigYaml || entitiesToYaml(entities)
    const yamlBlob = new Blob([yamlContent], { type: 'text/yaml' })
    const yamlFile = new File([yamlBlob], `${workflowId}_input.yaml`, { type: 'text/yaml' })
    
    const yamlFormData = new FormData()
    yamlFormData.append('file', yamlFile)
    
    const yamlUploadResponse = await fetch(`${apiUrl}/v1/upload`, {
      method: 'POST',
      body: yamlFormData,
    })
    
    if (!yamlUploadResponse.ok) {
      throw new Error(`YAML upload failed: ${yamlUploadResponse.statusText}`)
    }
    
    const yamlUploadData = await yamlUploadResponse.json()
    const inputYamlFilename = yamlUploadData.files?.[0]?.file_name || `${workflowId}_input.yaml`
    
    // Step 2: Build payload
    const payload: any = {
      inputYamlFilename: inputYamlFilename,
      protocolName: protocol,
      numDesigns: parseInt(numDesigns) || 10,
      budget: parseInt(budget) || 2,
      pipelineName: pipelineName || generatePipelineName(),
    }

    // Check if any file entity has an uploaded CIF file
    const fileEntity = entities.find(e => e.type === 'file' && (e.uploadedFilename || e.path))
    if (fileEntity?.uploadedFilename) {
      payload.cifFileFilename = fileEntity.uploadedFilename
    } else if (fileEntity?.path) {
      // If file was uploaded but filename not saved, use the path
      payload.cifFileFilename = fileEntity.path
    }

    return payload
  }

  const handleValidateDesign = async () => {
    console.log('Validating design...')
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      // Build payload (upload YAML if needed)
      const payload = await buildPayload()
      
      // Store payload for reuse in Start Workflow
      setValidationPayload(payload)
      
      console.log('Validation payload:', payload)
      
      // Post payload to /v1/design/check
      const designResponse = await fetch(`${apiUrl}/v1/design/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      if (!designResponse.ok) {
        const errorText = await designResponse.text()
        throw new Error(`Design validation failed: ${designResponse.statusText} - ${errorText}`)
      }
      
      const designData = await designResponse.json()
      console.log('Design validated:', designData)
      
      // Check if validation passed and extract CIF URL
      if (designData.check_passed && designData.cif_url) {
        const fullCifUrl = `${apiUrl}${designData.cif_url}`
        const viewerUrl = `https://nano-protein-viewer-react.juliocesar.io/?from=remote_url&url=${encodeURIComponent(fullCifUrl)}`
        
        setCifViewerUrl(viewerUrl)
        setShowCifViewer(true)
        toast({
          title: "Validation successful",
          description: "Design validation completed successfully!",
        })
      } else {
        toast({
          title: "Validation successful",
          description: "Design validation completed successfully!",
        })
      }
    } catch (error) {
      console.error('Error validating design:', error)
      toast({
        title: "Validation failed",
        description: `Failed to validate design: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }

  const handleStartWorkflow = async () => {
    console.log('Starting workflow...')
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      // Use stored payload if available, otherwise build a new one
      let payload = validationPayload
      
      if (!payload) {
        // If no stored payload, build a new one (this shouldn't happen if validate was called first)
        payload = await buildPayload()
        setValidationPayload(payload)
      }
      
      console.log('Start workflow payload:', payload)
      
      // Post payload to /v1/design/create
      const designResponse = await fetch(`${apiUrl}/v1/design/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      if (!designResponse.ok) {
        const errorText = await designResponse.text()
        throw new Error(`Workflow start failed: ${designResponse.statusText} - ${errorText}`)
      }
      
      const designData = await designResponse.json()
      console.log('Workflow started:', designData)
      
      toast({
        title: "Workflow started",
        description: "Workflow has been started successfully!",
      })
      
      // Redirect to jobs page on success
      router.push('/jobs')
    } catch (error) {
      console.error('Error starting workflow:', error)
      toast({
        title: "Error",
        description: `Failed to start workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }


  const _handleReRun = () => {
    console.log('Re-running pipeline...')
    // Implement re-run logic
  }

  const _handleCancel = () => {
    console.log('Canceling pipeline...')
    // Implement cancel logic
  }

  const _handleResetToDefaults = () => {
    console.log('Resetting to defaults...')
    // Implement reset logic
  }

  const _handleSaveChanges = () => {
    console.log('Saving changes...')
    // Implement save logic
  }

  // Convert entities to YAML format
  const entitiesToYaml = (entities: Entity[]): string => {
    if (entities.length === 0) {
      return `entities:
  # Add your entities here (proteins, ligands, files)
`
    }

    let yaml = 'entities:\n'
    
    entities.forEach((entity) => {
      if (entity.type === 'protein') {
        yaml += '  - protein:\n'
        if (entity.id) yaml += `      id: ${entity.id}\n`
        if (entity.sequence) yaml += `      sequence: ${entity.sequence}\n`
        if (entity.cyclic) yaml += `      cyclic: ${entity.cyclic}\n`
        if (entity.binding_types) {
          if (typeof entity.binding_types === 'string') {
            yaml += `      binding_types: ${entity.binding_types}\n`
          }
        }
        if (entity.secondary_structure) {
          yaml += `      secondary_structure: ${entity.secondary_structure}\n`
        }
      } else if (entity.type === 'ligand') {
        yaml += '  - ligand:\n'
        if (entity.ids && entity.ids.length > 0) {
          yaml += `      id: [${entity.ids.join(', ')}]\n`
        } else if (entity.id) {
          yaml += `      id: ${entity.id}\n`
        }
        if (entity.ccd) yaml += `      ccd: ${entity.ccd}\n`
        if (entity.smiles) yaml += `      smiles: '${entity.smiles}'\n`
        if (entity.binding_types) {
          if (typeof entity.binding_types === 'string') {
            yaml += `      binding_types: ${entity.binding_types}\n`
          }
        }
          } else if (entity.type === 'file') {
            yaml += '  - file:\n'
            // Use uploadedFilename if available (server filename), otherwise use original name
            const filePath = entity.uploadedFilename || entity.uploadedFile?.name || entity.path
            if (filePath) yaml += `      path: ${filePath}\n`
        if (entity.include && entity.include.length > 0) {
          yaml += '      include:\n'
          entity.include.forEach((inc) => {
            yaml += `        - chain:\n`
            yaml += `            id: ${inc.id}\n`
            if (inc.res_index) yaml += `            res_index: ${inc.res_index}\n`
          })
        }
        if (entity.binding_types_chain && entity.binding_types_chain.length > 0) {
          yaml += '      binding_types:\n'
          entity.binding_types_chain.forEach((bt) => {
            yaml += `        - chain:\n`
            yaml += `            id: ${bt.id}\n`
            if (bt.binding) yaml += `            binding: ${bt.binding}\n`
            if (bt.not_binding) yaml += `            not_binding: ${bt.not_binding}\n`
          })
        }
        if (entity.structure_groups) {
          if (typeof entity.structure_groups === 'string') {
            yaml += `      structure_groups: ${entity.structure_groups}\n`
          } else if (Array.isArray(entity.structure_groups) && entity.structure_groups.length > 0) {
            yaml += '      structure_groups:\n'
            entity.structure_groups.forEach((sg) => {
              yaml += `        - group:\n`
              yaml += `            visibility: ${sg.visibility}\n`
              yaml += `            id: ${sg.id}\n`
              if (sg.res_index) yaml += `            res_index: ${sg.res_index}\n`
            })
          }
        }
        if (entity.exclude && entity.exclude.length > 0) {
          yaml += '      exclude:\n'
          entity.exclude.forEach((exc) => {
            yaml += `        - chain:\n`
            yaml += `            id: ${exc.id}\n`
            if (exc.res_index) yaml += `            res_index: ${exc.res_index}\n`
          })
        }
      }
    })

    // Only add constraints section if there are actual constraints
    // For now, we'll leave it empty since constraints are not yet implemented in the form
    // yaml += '\nconstraints:\n'

    return yaml
  }

  // Handle entities change and update YAML
  const handleEntitiesChange = (newEntities: Entity[]) => {
    setEntities(newEntities)
    const newYaml = entitiesToYaml(newEntities)
    setVhhConfigYaml(newYaml)
    setYamlHasChanges(true)
    
    // Validate the YAML content
    const result = validateYamlContent(newYaml)
    setYamlValidationResult(result)
  }

  const handleYamlChange = (value: string) => {
    setVhhConfigYaml(value)
    setYamlHasChanges(true)
    
    // Validate the YAML content
    const result = validateYamlContent(value)
    setYamlValidationResult(result)

    // Clear previous timeout
    if (yamlTimeoutRef.current) {
      clearTimeout(yamlTimeoutRef.current)
    }

    // Parse YAML to update model selection if folding_model changes (with debounce)
    yamlTimeoutRef.current = setTimeout(() => {
      updateModelSelectionFromYaml(value)
    }, 500) // 500ms debounce
  }

  const updateModelSelectionFromYaml = (yamlContent: string) => {
    try {
      // Parse both folding_model and plm_model from YAML
      const foldingModelRegex = /folding_model:\s*["']([^"']*)["']/
      const plmModelRegex = /plm_model:\s*["']([^"']*)["']/
      
      const foldingModelMatch = yamlContent.match(foldingModelRegex)
      const plmModelMatch = yamlContent.match(plmModelRegex)
      
      // Update folding_model node (nbb2)
      if (foldingModelMatch && foldingModelMatch[1]) {
        const foldingModel = foldingModelMatch[1]
        if (foldingModel === 'nbb2' || foldingModel === 'esmfold') {
          setNodes(prevNodes => 
            prevNodes.map(node => {
              if (node.id === "3" && node.data?.type === "model-load") {
                const updatedNode = {
                  ...node,
                  data: {
                    ...node.data,
                    model: foldingModel,
                    label: `Model load: ${foldingModel}`,
                    model_options: node.data.model_options
                  }
                }
                
                // Update selectedNode if this is the currently selected node
                if (selectedNode?.id === "3") {
                  setSelectedNode(updatedNode)
                }
                
                return updatedNode
              }
              return node
            })
          )
        }
      }
      
      // Update plm_model node (esm2-650M)
      if (plmModelMatch && plmModelMatch[1]) {
        const plmModel = plmModelMatch[1]
        if (plmModel === 'esm2-650M') {
          setNodes(prevNodes => 
            prevNodes.map(node => {
              if (node.id === "2" && node.data?.type === "model-load") {
                const updatedNode = {
                  ...node,
                  data: {
                    ...node.data,
                    model: plmModel,
                    label: `Model load: ${plmModel}`,
                    model_options: node.data.model_options
                  }
                }
                
                // Update selectedNode if this is the currently selected node
                if (selectedNode?.id === "2") {
                  setSelectedNode(updatedNode)
                }
                
                return updatedNode
              }
              return node
            })
          )
        }
      }
    } catch (error) {
      console.error('Error parsing YAML for model parameters:', error)
    }
  }

  const handleYamlSave = async () => {
    try {
      // Validate and clean the content
      const result = validateAndCleanYamlContent(vhhConfigYaml)
      
      if (!result.isValid) {
        setYamlValidationResult({ isValid: false, errors: result.errors, warnings: [] })
        return
      }

      // Update the content if it was sanitized
      if (result.content !== vhhConfigYaml) {
        setVhhConfigYaml(result.content)
      }

      console.log('Saving YAML configuration locally:', result.content)
      setYamlHasChanges(false)
      setYamlValidationResult(null)
      setYamlSaveMessage('Configuration saved successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setYamlSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save configuration:', error)
    }
  }

  const handleYamlReset = async () => {
    try {
      setYamlIsResetting(true)
      const config = await fetchVHHConfig()
      setVhhConfigYaml(config)
      setYamlHasChanges(false)
      setYamlValidationResult(null)
      setYamlSaveMessage('Configuration reset to defaults!')
      
      // Reset model selection from YAML
      updateModelSelectionFromYaml(config)
      
      // Clear success message after 3 seconds
      setTimeout(() => setYamlSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to reset configuration:', error)
    } finally {
      setYamlIsResetting(false)
    }
  }

  if (!pipelineData) {
    return (
      <LoadingSpinner
        message="Loading pipeline..."
        variant="centered"
        className="h-screen"
      />
    )
  }

  const { pipeline } = pipelineData

  return (
    <div className="h-full w-full flex flex-col relative -m-4 overflow-hidden max-w-full flex-1 min-h-0">
      {/* Header */}
      <PipelineHeader
        pipelineTitle={pipeline.title}
        onRun={handleStartWorkflow}
        isFormValid={isFormValid()}
        estimatedRuntime="15min"
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Full Screen Editor with Floating Form */}
      <div className="flex-1 relative overflow-hidden min-h-0 w-full max-w-full">
        {/* Main Editor Area - Takes full screen */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {/* Overview Tab - Pipeline Editor */}
          {activeTab === 'overview' && (
            <OverviewTab
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              colorMode={colorMode}
            />
          )}

          {/* Default Parameters Tab */}
          {activeTab === 'parameters' && (
            <ParametersTab
              onResetToDefaults={handleYamlReset}
              onSaveChanges={handleYamlSave}
              vhhConfigYaml={vhhConfigYaml}
              onYamlChange={handleYamlChange}
              hasChanges={yamlHasChanges}
              validationResult={yamlValidationResult}
              saveMessage={yamlSaveMessage}
              isResetting={yamlIsResetting}
            />
          )}
        </div>

        {/* Floating Form Panel */}
        {selectedNode && activeTab !== 'parameters' && (
          <div className={`absolute top-4 right-4 ${selectedNode.data?.type === 'design' ? 'w-[600px]' : 'w-80'} max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] bg-background/95 backdrop-blur-sm border rounded-xl shadow-lg z-10`}>
            <div className="p-4 h-full flex flex-col">
              {/* Floating Form Header */}
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-base font-semibold text-foreground">
                  {String(selectedNode.data?.label || 'Node Details')}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNode(null)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>

              {/* Floating Form Content - Scrollable Area */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full">
                  {/* Design Step Form */}
                  {selectedNode.data?.type === 'design' ? (
                    <DesignStepForm
                      entities={entities}
                      onEntitiesChange={handleEntitiesChange}
                      onValidate={handleValidateDesign}
                      onLoadExample={handleLoadExampleDesign}
                    />
                  ) : (
                    <>
                      {/* Selected Node Details */}
                      <div className="space-y-3">
                        {/* Show Label and Description for non-input nodes */}
                        {selectedNode.data?.label !== 'Input: Target Protein' && (
                      <>
                        <div>
                          <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400">Description</h4>
                          <p className="text-xs text-gray-900 dark:text-gray-100">{String(selectedNode.data?.description || 'N/A')}</p>
                        </div>
                        {(selectedNode.data?.model as string) && (
                          <div>
                            <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400">Model</h4>
                            {selectedNode.data?.model_options ? (
                              <Select value={String(selectedNode.data.model)} onValueChange={handleModelChange}>
                                <SelectTrigger className="mt-1 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(selectedNode.data.model_options as any[])?.map((option: any) => (
                                    <SelectItem key={option.value} value={option.value} className="text-xs">
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-xs text-gray-900 dark:text-gray-100">{String(selectedNode.data.model)}</p>
                            )}
                            <div className="mt-1">
                              <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400">Param Key</h4>
                              <p className="text-xs text-gray-900 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {selectedNode.id === "2" ? "template_config.plm_model" : "template_config.folding_model"}
                              </p>
                            </div>
                          </div>
                        )}
                        {(() => {
                          // Get the current model option details
                          const currentModelOption = (selectedNode.data?.model_options as any[])?.find((option: any) => option.value === selectedNode.data.model)
                          return currentModelOption ? (
                            <>
                              <div>
                                <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400">Params</h4>
                                <p className="text-xs text-gray-900 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                  {String(currentModelOption.params)}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400">GPU Usage</h4>
                                <p className="text-xs text-gray-900 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                  {String(currentModelOption.gpu_usage)}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400">Load Time</h4>
                                <p className="text-xs text-gray-900 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                  {String(currentModelOption.load_time)}
                                </p>
                              </div>
                            </>
                          ) : null
                        })()}
                        {(selectedNode.data?.substeps as string[]) && (
                          <div>
                            <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400">Process Steps</h4>
                            <ul className="space-y-1">
                              {(selectedNode.data.substeps as string[]).map((step: string, index: number) => (
                                <li key={index} className="flex items-center text-xs text-gray-900 dark:text-gray-100">
                                  <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center justify-center mr-2 flex-shrink-0">
                                    {index + 1}
                                  </span>
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(selectedNode.data?.load_time as string) && (
                          <div>
                            <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400">Load Time</h4>
                            <p className="text-xs text-gray-900 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {String(selectedNode.data.load_time)}
                            </p>
                          </div>
                        )}
                        {(selectedNode.data?.outputs as string) && (
                          <div>
                            <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400">Outputs</h4>
                            <p className="text-xs text-gray-900 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {String(selectedNode.data.outputs)}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Target Protein Input Form */}
                    {selectedNode.data?.label === 'Input: Target Protein' && (
                      <div className="pb-2">
                        <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400 mb-3">Target Protein Configuration</h4>
                        <form onSubmit={handleSubmitForm} className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Target ID (UniProt ID)
                              </label>
                              <Input
                                value={targetFormData.target_id}
                                onChange={(e) => handleFormChange('target_id', e.target.value)}
                                placeholder="e.g., P12345"
                                className="w-full h-8 text-xs border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Target Name
                              </label>
                              <Input
                                value={targetFormData.target_name}
                                onChange={(e) => handleFormChange('target_name', e.target.value)}
                                placeholder="e.g., Human Insulin"
                                className="w-full h-8 text-xs border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Region
                            </label>
                            <Input
                              value={targetFormData.region}
                              onChange={(e) => handleFormChange('region', e.target.value)}
                              placeholder="e.g., A:18-132"
                              className="w-full h-8 text-xs border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Target Hotspot Residues
                            </label>
                            <Input
                              value={targetFormData.target_hotspot_residues}
                              onChange={(e) => handleFormChange('target_hotspot_residues', e.target.value)}
                              placeholder="e.g., A54,A56,A66,A115"
                              className="w-full h-8 text-xs border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Masked Binder Sequence
                            </label>
                            <Textarea
                              value={targetFormData.masked_binder_seq}
                              onChange={(e) => handleFormChange('masked_binder_seq', e.target.value)}
                              placeholder="e.g., EVQLVESGGGLVQPGGSLRLSCAASG*********WFRQAPGKEREF***********NADSVKGRFTISRDNAKNTLYLQMNSLRAEDTAVYYC************WGQGTLVTVSS"
                              className="w-full min-h-[80px] font-mono text-xs border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                              required
                            />
                          </div>

                          <div className="flex justify-start pt-1">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={handleLoadExample}
                              className="h-7 px-3 text-xs"
                            >
                              Load Example
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Job Configuration Panel */}
        {showJobConfig && activeTab !== 'parameters' && (
          <div className="absolute top-4 left-4 w-72 max-w-[calc(100vw-2rem)] bg-background/95 backdrop-blur-sm border rounded-xl shadow-lg z-10">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground flex items-center">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Workflow Config
                </h3>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowJobConfig(false)}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowJobConfig(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <PipelineJobConfig
                pipelineName={pipelineName}
                setPipelineName={setPipelineName}
                editPipelineName={editPipelineName}
                setEditPipelineName={setEditPipelineName}
                generatePipelineName={generatePipelineName}
                gpuType={gpuType}
                setGpuType={setGpuType}
                protocol={protocol}
                setProtocol={setProtocol}
                numDesigns={numDesigns}
                setNumDesigns={setNumDesigns}
                budget={budget}
                setBudget={setBudget}
              />
            </div>
          </div>
        )}

        {/* Job Config Toggle Button (when panel is hidden) */}
        {!showJobConfig && activeTab !== 'parameters' && (
          <div className="absolute top-4 left-4 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowJobConfig(true)}
              className="bg-background/95 backdrop-blur-sm border shadow-lg h-8 px-3"
            >
              <Settings2 className="w-3 h-3 mr-1" />
              Workflow Config
            </Button>
          </div>
        )}
      </div>

      {/* CIF Viewer Modal */}
      <Dialog open={showCifViewer} onOpenChange={setShowCifViewer}>
        <DialogContent className="max-w-[95vw] !max-w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle>Design Visualization</DialogTitle>
            <DialogDescription>
              The binding site should be highlighting a different color than the rest of the target.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden">
            {cifViewerUrl && (
              <iframe
                src={cifViewerUrl}
                className="w-full h-full border-0 rounded-lg"
                title="Protein Structure Viewer"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}