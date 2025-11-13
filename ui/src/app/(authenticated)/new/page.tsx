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
  X,
  Loader2} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

// Import extracted components and utilities
import { getLayoutedElements } from '../utils/layoutUtils'
import { getPipelineData } from '../utils/pipelineDataUtils'
import { OverviewTab } from './components/OverviewTab'
// Import new components
import { DesignStepForm, type Entity } from './components/DesignStepForm'
import BoltzgenWorkflowConfig from './components/BoltzgenWorkflowConfig'
import { BinderDesignForm, type BinderFormState } from './components/BinderDesignForm'
import { fetchVHHConfig } from './utils/configLoader'
import { validateAndCleanYamlContent,validateYamlContent } from './utils/yaml-validator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { YamlEditor } from './components/YamlEditor'

export default function PipelineEditorPage() {
  const router = useRouter()
  const { toast } = useToast()
  const pipelineId = 'boltzgen'
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [pipelineData, setPipelineData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showJobConfig, setShowJobConfig] = useState(true)
  const [operatingMode, setOperatingMode] = useState<'standard' | 'binder-optimization'>('standard')
  
  // Job configuration state
  const [pipelineName, setPipelineName] = useState('')
  const [editPipelineName, setEditPipelineName] = useState(true)
  const [gpuType, setGpuType] = useState('8x H100 Nebius')
  const [protocol, setProtocol] = useState('protein-anything')
  const [numDesigns, setNumDesigns] = useState('10')
  const [budget, setBudget] = useState('2')
  
  // Binder optimization state
  const [binderLength, setBinderLength] = useState('110-130')
  const [binderType, setBinderType] = useState('nanobody')
  const [numCandidates, setNumCandidates] = useState('30')
  const [affinityWeight, setAffinityWeight] = useState('0.6')
  const [selectivityWeight, setSelectivityWeight] = useState('0.3')
  const [propertiesWeight, setPropertiesWeight] = useState('0.1')
  const [multiObjective, setMultiObjective] = useState(true)
  
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
  const [isLoadingExample, setIsLoadingExample] = useState(false)
  const [isValidatingDesign, setIsValidatingDesign] = useState(false)
  const [isStartingWorkflow, setIsStartingWorkflow] = useState(false)
  const [isLoadingBinderExample, setIsLoadingBinderExample] = useState(false)

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

  // Binder optimization form state
  const [binderForm, setBinderForm] = useState<BinderFormState>({
    projectType: 'existing_binder',
    targetsPositive: [],
    targetsNegative: [],
    scaffold: { pdbPath: '', uploadedFilename: undefined, chains: [], design_regions: [] },
    scoring: { multiObjective: true, affinity: '0.6', selectivity: '0.3', properties: '0.1' },
    numCandidates: '5'
  })

  const uploadFileToApi = async (file: File): Promise<string> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`${apiUrl}/v1/upload`, { method: 'POST', body: formData })
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }
    const data = await response.json()
    return data.files?.[0]?.file_name || file.name
  }

  const binderToYaml = (form: BinderFormState, projectName: string): string => {
    const yamlLines: string[] = []
    yamlLines.push('project:')
    yamlLines.push(`  name: "${projectName}"`)
    yamlLines.push(`  type: "${form.projectType}"`)
    yamlLines.push('')
    yamlLines.push('targets:')
    yamlLines.push('  positive:')
    form.targetsPositive.forEach(t => {
      if (!t.name || (!t.pdbPath && !t.uploadedFilename) || !t.chain) return
      yamlLines.push('    - name: "' + t.name + '"')
      yamlLines.push('      pdb: "' + (t.uploadedFilename || t.pdbPath) + '"')
      yamlLines.push('      chain: "' + t.chain + '"')
    })
    yamlLines.push('  negative:')
    form.targetsNegative.forEach(t => {
      if (!t.name || (!t.pdbPath && !t.uploadedFilename) || !t.chain) return
      yamlLines.push('    - name: "' + t.name + '"')
      yamlLines.push('      pdb: "' + (t.uploadedFilename || t.pdbPath) + '"')
      yamlLines.push('      chain: "' + t.chain + '"')
    })
    yamlLines.push('')
    yamlLines.push('scaffold:')
    if (form.scaffold.uploadedFilename || form.scaffold.pdbPath) {
      yamlLines.push('  pdb: "' + (form.scaffold.uploadedFilename || form.scaffold.pdbPath) + '"')
    } else {
      yamlLines.push('  pdb: ""')
    }
    const chains = form.scaffold.chains
    if (chains.length > 0) {
      yamlLines.push('  chains: [' + chains.map(c => `"${c}"`).join(', ') + ']')
    } else {
      yamlLines.push('  chains: []')
    }
    yamlLines.push('  design_regions:')
    if (form.scaffold.design_regions.length === 0) {
      yamlLines.push('    []')
    } else {
      form.scaffold.design_regions.forEach(dr => {
        if (!dr.chain || !dr.residues) return
        yamlLines.push('    - chain: "' + dr.chain + '"')
        yamlLines.push('      residues: "' + dr.residues + '"')
      })
    }
    // parameters (from Boltzgen form)
    yamlLines.push('')
    yamlLines.push('parameters:')
    yamlLines.push(`  num_designs: ${parseInt(numDesigns) || 10}`)
    yamlLines.push(`  num_candidates: ${parseInt(binderForm.numCandidates || '5')}`)
    yamlLines.push(`  budget: ${parseInt(budget) || 2}`)
    // scoring
    const s = form.scoring || { multiObjective: true, affinity: '0.6', selectivity: '0.3', properties: '0.1' }
    yamlLines.push('')
    yamlLines.push('scoring:')
    yamlLines.push(`  multi_objective: ${s.multiObjective ? 'true' : 'false'}`)
    yamlLines.push('  weights:')
    yamlLines.push(`    affinity: ${s.affinity}`)
    yamlLines.push(`    selectivity: ${s.selectivity}`)
    yamlLines.push(`    properties: ${s.properties}`)
    return yamlLines.join('\n')
  }

  // Keep YAML in sync when binder form changes and binder mode active
  useEffect(() => {
    if (operatingMode === 'binder-optimization') {
      const yaml = binderToYaml(binderForm, pipelineName || generatePipelineName())
      setVhhConfigYaml(yaml)
      setYamlHasChanges(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binderForm, operatingMode, numDesigns, budget, pipelineName])

  const handleLoadBinderExample = async () => {
    try {
      setIsLoadingBinderExample(true)
      // Fetch from public and upload to API
      const fetchAndUpload = async (publicPath: string, filename: string) => {
        const res = await fetch(publicPath)
        if (!res.ok) throw new Error(`Failed to fetch ${publicPath}`)
        const blob = await res.blob()
        const file = new File([blob], filename, { type: 'chemical/x-pdb' })
        const uploaded = await uploadFileToApi(file)
        return { uploaded, file }
      }
      const base = '/examples/binder_optimization_example'
      const [cxcr4, ccr5, cxcr2, fab] = await Promise.all([
        fetchAndUpload(`${base}/8u4q_cxcr4.pdb`, '8u4q_cxcr4.pdb'),
        fetchAndUpload(`${base}/4mbs_ccr5.pdb`, '4mbs_ccr5.pdb'),
        fetchAndUpload(`${base}/6lfo_cxcr2.pdb`, '6lfo_cxcr2.pdb'),
        fetchAndUpload(`${base}/8u4q_fab.pdb`, '8u4q_fab.pdb'),
      ])
      // Set pipeline name example
      setPipelineName(prev => prev || 'CXCR4_quick_test')
      // Populate binder form
      setBinderForm({
        projectType: 'existing_binder',
        targetsPositive: [
          { name: 'CXCR4', chain: 'R', uploadedFilename: cxcr4.uploaded, pdbPath: cxcr4.file.name }
        ],
        targetsNegative: [
          { name: 'CCR5', chain: 'A', uploadedFilename: ccr5.uploaded, pdbPath: ccr5.file.name },
          { name: 'CXCR2', chain: 'A', uploadedFilename: cxcr2.uploaded, pdbPath: cxcr2.file.name },
        ],
        scaffold: {
          uploadedFilename: fab.uploaded,
          pdbPath: fab.file.name,
          chains: ['H','L'],
          design_regions: [
            { chain: 'H', residues: '26-35,50-65,95-102' },
            { chain: 'L', residues: '24-34,50-56,89-97' },
          ]
        }
      })
      toast({
        title: 'Example loaded',
        description: 'Binder optimization example loaded successfully.',
      })
    } catch (err) {
      console.error('Failed to load binder example', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingBinderExample(false)
    }
  }


  // Ensure body can scroll (remove previous scroll locking)
  useEffect(() => {
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  }, [])

  // No external parameters tab; selection persists

  // Function to load and render pipeline nodes
  const loadPipelineNodes = useCallback(() => {
    const data = getPipelineData(pipelineId, operatingMode)
    if (data) {
      setPipelineData(data)
      // Reset nodes/edges to avoid stale internal positions between mode switches
      setNodes([])
      setEdges([])
      
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
      
      // Always wrap with start/end and connect to entry/exit nodes based on graph structure
      const diagramNodes = data.diagram.nodes
      const diagramEdges = data.diagram.edges
      
      // Build in/out degree maps to find entry and exit nodes
      const inDegree: Record<string, number> = {}
      const outDegree: Record<string, number> = {}
      diagramNodes.forEach(n => {
        inDegree[n.id] = 0
        outDegree[n.id] = 0
      })
      diagramEdges.forEach(e => {
        if (outDegree[e.source] !== undefined) outDegree[e.source] += 1
        if (inDegree[e.target] !== undefined) inDegree[e.target] += 1
      })
      const entryNodeIds = diagramNodes.filter(n => inDegree[n.id] === 0).map(n => n.id)
      const exitNodeIds = diagramNodes.filter(n => outDegree[n.id] === 0).map(n => n.id)
      
      // Fallback to first/last by order if needed
      const fallbackFirst = diagramNodes[0]?.id
      const fallbackLast = diagramNodes[diagramNodes.length - 1]?.id
      const startTargets = entryNodeIds.length > 0 ? entryNodeIds : (fallbackFirst ? [fallbackFirst] : [])
      const endSources = exitNodeIds.length > 0 ? exitNodeIds : (fallbackLast ? [fallbackLast] : [])
      
      const nodesWithStartEnd = [startNode, ...diagramNodes, endNode]
      const edgesWithStartEnd = [
        ...diagramEdges,
        ...startTargets.map((tid, i) => ({ id: `e-start-${tid}-${i}`, source: 'start', target: tid })),
        ...endSources.map((sid, i) => ({ id: `e-${sid}-end-${i}`, source: sid, target: 'end' })),
      ]
      
      // Apply initial layout (horizontal by default)
      let { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodesWithStartEnd,
        edgesWithStartEnd
      )
      
      setNodes(layoutedNodes)
      setEdges(layoutedEdges)
      
      // Don't auto-select any node on load
      setSelectedNode(null)
    } else {
      // Redirect to pipelines page if pipeline not found
      router.push('/pipelines')
    }
  }, [pipelineId, router, operatingMode])

  // Load pipeline data
  useEffect(() => {
    loadPipelineNodes()
  }, [pipelineId, router, loadPipelineNodes])

  // Binder mode defaults: protocol read-only 'nanobody-anything', designs 20, budget 20
  useEffect(() => {
    if (operatingMode === 'binder-optimization') {
      setProtocol('nanobody-anything')
      setNumDesigns('20')
      setBudget('20')
    }
  }, [operatingMode])
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

  const handleLoadExample = async () => {
    setIsLoadingExample(true)
    // Add a small delay to show loading state even for synchronous operation
    await new Promise(resolve => setTimeout(resolve, 300))
    setTargetFormData({
      target_id: 'Q9NZQ7',
      target_name: 'PDL1',
      region: 'A:18-132',
      target_hotspot_residues: 'A54,A56,A66,A115',
      masked_binder_seq: 'EVQLVESGGGLVQPGGSLRLSCAASG*********WFRQAPGKEREF***********NADSVKGRFTISRDNAKNTLYLQMNSLRAEDTAVYYC************WGQGTLVTVSS'
    })
    setIsLoadingExample(false)
  }

  const handleLoadExampleDesign = async () => {
    setIsLoadingExample(true)
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
    } finally {
      setIsLoadingExample(false)
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
    // Append operating mode for backend awareness
    payload.operatingMode = operatingMode === 'binder-optimization' ? 'BINDER_OPTIMIZATION' : 'STANDARD_BOLTZGEN'

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
    setIsValidatingDesign(true)
    
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
    } finally {
      setIsValidatingDesign(false)
    }
  }

  const handleStartWorkflow = async () => {
    // Validate form based on operating mode
    if (operatingMode === 'binder-optimization') {
      const hasPositive = binderForm.targetsPositive.some(
        (t) => t.name && (t.uploadedFilename || t.pdbPath) && t.chain
      )
      const hasScaffold = Boolean(binderForm.scaffold.uploadedFilename || binderForm.scaffold.pdbPath)
      if (!hasPositive || !hasScaffold) {
        toast({
          title: "Fill form first",
          description: "Please complete binder targets and scaffold in the Design form.",
          variant: "destructive",
        })
        // Focus the Binder Design node so the user can fill it
        const binderNode = nodes.find(n => (n as any)?.data?.type === 'design_binder_optimization')
        if (binderNode) {
          setSelectedNode(binderNode as any)
        }
        return
      }
    } else {
      // Require at least one entity in the Design specification form
      if (entities.length === 0) {
        toast({
          title: "Fill form first",
          description: "Please add at least one entity in the Design specification node.",
          variant: "destructive",
        })
        // Focus the Design node so the user can fill it
        const designNode = nodes.find(n => (n as any)?.data?.type === 'design')
        if (designNode) {
          setSelectedNode(designNode as any)
        }
        return
      }
    }
    console.log('Starting workflow...')
    setIsStartingWorkflow(true)
    
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
      
      // Post payload to endpoint based on operating mode
      const createPath = operatingMode === 'binder-optimization'
        ? '/v1/design/create/binder-optimization'
        : '/v1/design/create'
      const designResponse = await fetch(`${apiUrl}${createPath}`, {
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
    } finally {
      setIsStartingWorkflow(false)
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
    <div className="h-full w-full flex flex-col relative -m-4 overflow-auto max-w-full flex-1 min-h-0">
      {/* Full Screen Editor with Floating Form */}
      <div className="flex-1 relative overflow-auto min-h-0 w-full max-w-full">
        {/* Main Editor Area - Takes full screen */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {/* Overview Tab - Pipeline Editor */}
          {activeTab === 'overview' && (
            <OverviewTab
              key={operatingMode}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              colorMode={colorMode}
            />
          )}

          {/* Parameters tab removed; YAML editor moved into Design form */}
        </div>

        {/* Floating Form Panel */}
        {selectedNode && (
          <div className="absolute top-24 right-4 w-120 max-h-[calc(100vh-8rem)] bg-background/95 backdrop-blur-sm border rounded-xl shadow-lg z-10 w-[600px]">
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
                  className="h-8 w-8 p-0"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Floating Form Content - Scrollable Area */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full overflow-y-auto pr-2">
                  {selectedNode.data?.type === 'design' ? (
                    <DesignStepForm
                      entities={entities}
                      onEntitiesChange={handleEntitiesChange}
                      onValidate={handleValidateDesign}
                      onLoadExample={handleLoadExampleDesign}
                      isLoadingExample={isLoadingExample}
                      isValidatingDesign={isValidatingDesign}
                      yamlValue={vhhConfigYaml}
                      onYamlChange={handleYamlChange}
                      onYamlSave={handleYamlSave}
                      onYamlReset={handleYamlReset}
                      yamlHasChanges={yamlHasChanges}
                      yamlSaveMessage={yamlSaveMessage}
                      isYamlResetting={yamlIsResetting}
                    />
                  ) : selectedNode.data?.type === 'design_binder_optimization' ? (
                    <Tabs defaultValue="form" className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-3 flex-shrink-0">
                        <div className="flex items-center gap-3 flex-1">
                          <TabsList className="h-8">
                            <TabsTrigger value="form" className="px-3 py-1.5 text-xs">Form</TabsTrigger>
                            <TabsTrigger value="yaml" className="px-3 py-1.5 text-xs">YAML</TabsTrigger>
                          </TabsList>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleLoadBinderExample}
                            disabled={isLoadingBinderExample}
                            className="h-7 text-xs"
                          >
                            {isLoadingBinderExample ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              'Load Example'
                            )}
                          </Button>
                        </div>
                      </div>
                      <TabsContent value="form" className="flex-1 min-h-0">
                        <BinderDesignForm
                          pipelineName={pipelineName || generatePipelineName()}
                          form={binderForm}
                          onChange={setBinderForm}
                          onUploadFile={uploadFileToApi}
                        />
                      </TabsContent>
                      <TabsContent value="yaml" className="flex-1 min-h-0">
                        <div className="h-[520px]">
                          <YamlEditor
                            value={vhhConfigYaml}
                            onChange={() => {}}
                            isLoading={false}
                            error={null}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  ) : selectedNode.type === 'pipeline' && selectedNode.data?.pipelineType === 'boltzgen' ? (
                    <>
                      {/* Workflow Config Form */}
                      <BoltzgenWorkflowConfig
                        protocol={protocol}
                        setProtocol={setProtocol}
                        numDesigns={numDesigns}
                        setNumDesigns={setNumDesigns}
                        budget={budget}
                        setBudget={setBudget}
                        protocolReadOnly={operatingMode === 'binder-optimization'}
                      />
                      {/* Boltzgen Pipeline Node Details */}
                      <div className="space-y-3 pt-2 border-t">
                        <div>
                          <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400">Type</h4>
                          <p className="text-xs text-gray-900 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded capitalize">
                            {String(selectedNode.type || 'N/A')}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400">Description</h4>
                          <p className="text-xs text-gray-900 dark:text-gray-100">{String(selectedNode.data?.description || 'N/A')}</p>
                        </div>
                        {(selectedNode.data?.substeps as string[]) && (
                          <div>
                            <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400 mb-2">Process Steps</h4>
                            <div className="flex items-center flex-wrap gap-2 text-xs text-gray-900 dark:text-gray-100">
                              {(selectedNode.data.substeps as string[]).map((step: string, index: number) => (
                                <React.Fragment key={index}>
                                  <span className="flex items-center gap-1">
                                    <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center justify-center flex-shrink-0">
                                      {index + 1}
                                    </span>
                                    <span>{step}</span>
                                  </span>
                                  {index < (selectedNode.data.substeps as string[]).length - 1 && (
                                    <span className="text-gray-400 dark:text-gray-500">→</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : selectedNode.data?.type === 'selectivity-scoring' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs">Top N candidates</label>
                        <Input
                          value={binderForm.numCandidates ?? '5'}
                          onChange={(e) => setBinderForm(prev => ({ ...prev, numCandidates: e.target.value }))}
                          className="h-8 text-xs w-32 mt-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          id="multiObjective"
                          type="checkbox"
                          checked={binderForm.scoring?.multiObjective ?? true}
                          onChange={(e) => setBinderForm(prev => ({
                            ...prev,
                            scoring: {
                              multiObjective: e.target.checked,
                              affinity: prev.scoring?.affinity ?? '0.6',
                              selectivity: prev.scoring?.selectivity ?? '0.3',
                              properties: prev.scoring?.properties ?? '0.1'
                            }
                          }))}
                        />
                        <label htmlFor="multiObjective" className="text-xs">multi_objective</label>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs">affinity</label>
                          <Input
                            value={binderForm.scoring?.affinity ?? '0.6'}
                            onChange={(e) => setBinderForm(prev => ({
                              ...prev,
                              scoring: {
                                multiObjective: prev.scoring?.multiObjective ?? true,
                                affinity: e.target.value,
                                selectivity: prev.scoring?.selectivity ?? '0.3',
                                properties: prev.scoring?.properties ?? '0.1'
                              }
                            }))}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs">selectivity</label>
                          <Input
                            value={binderForm.scoring?.selectivity ?? '0.3'}
                            onChange={(e) => setBinderForm(prev => ({
                              ...prev,
                              scoring: {
                                multiObjective: prev.scoring?.multiObjective ?? true,
                                affinity: prev.scoring?.affinity ?? '0.6',
                                selectivity: e.target.value,
                                properties: prev.scoring?.properties ?? '0.1'
                              }
                            }))}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs">properties</label>
                          <Input
                            value={binderForm.scoring?.properties ?? '0.1'}
                            onChange={(e) => setBinderForm(prev => ({
                              ...prev,
                              scoring: {
                                multiObjective: prev.scoring?.multiObjective ?? true,
                                affinity: prev.scoring?.affinity ?? '0.6',
                                selectivity: prev.scoring?.selectivity ?? '0.3',
                                properties: e.target.value
                              }
                            }))}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Selected Node Details */}
                      <div className="space-y-3">
                        {/* Show Label and Description for non-input nodes */}
                        {selectedNode.data?.label !== 'Input: Target Protein' && (
                      <>
                        <div>
                          <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400">Type</h4>
                          <p className="text-xs text-gray-900 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded capitalize">
                            {String(selectedNode.type || 'N/A')}
                          </p>
                        </div>
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
                            <h4 className="font-medium text-xs text-gray-600 dark:text-gray-400 mb-2">Process Steps</h4>
                            <div className="flex items-center flex-wrap gap-2 text-xs text-gray-900 dark:text-gray-100">
                              {(selectedNode.data.substeps as string[]).map((step: string, index: number) => (
                                <React.Fragment key={index}>
                                  <span className="flex items-center gap-1">
                                    <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center justify-center flex-shrink-0">
                                      {index + 1}
                                    </span>
                                    <span>{step}</span>
                                  </span>
                                  {index < (selectedNode.data.substeps as string[]).length - 1 && (
                                    <span className="text-gray-400 dark:text-gray-500">→</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
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
                              disabled={isLoadingExample}
                              className="h-7 px-3 text-xs"
                            >
                              {isLoadingExample ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                'Load Example'
                              )}
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

        {/* Floating minimal Workflow Config controls - name and GPU, inline row */}
        {showJobConfig && (
          <div className="absolute top-8 left-4 z-10">
            <div className="flex items-center gap-2">
              <Input
                id="pipelineName"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                placeholder="Pipeline name"
                className="h-10 text-sm md:text-base w-64"
              />
              <Select value={gpuType} onValueChange={setGpuType}>
                <SelectTrigger className="h-10 text-sm md:text-base w-40">
                  <SelectValue placeholder="GPU type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8x H100 Nebius" className="text-sm">
                    8x H100 Nebius
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Floating Start Workflow Button - Top right */}
        <div className="absolute top-8 right-6 z-10 flex items-center gap-6">
          <Link href="/jobs" className="text-sm md:text-base text-gray-300 hover:text-gray-200">
            Jobs
          </Link>
          <Button  
            onClick={handleStartWorkflow} 
            disabled={isStartingWorkflow}
            className="h-10 px-4 text-sm md:text-base"
          >
            {isStartingWorkflow ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                Start Workflow
              </>
            )}
          </Button>
        </div>

        {/* Operating Mode Select - Top center */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
          <Select value={operatingMode} onValueChange={(v) => setOperatingMode(v as any)}>
            <SelectTrigger className="h-10 text-sm md:text-base w-[320px]">
              <SelectValue placeholder="Select operating mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard Boltzgen</SelectItem>
              <SelectItem value="binder-optimization">Binder Optimization</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Job Config Toggle Button (when panel is hidden) */}
        {!showJobConfig && (
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