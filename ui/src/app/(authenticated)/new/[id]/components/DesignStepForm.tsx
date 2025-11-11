'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash2, ChevronDown, ChevronUp, Upload, X, CheckCircle2 } from 'lucide-react'
import React, { useState, useRef } from 'react'

export interface Entity {
  type: 'protein' | 'ligand' | 'file'
  id?: string
  ids?: string[] // For ligands with multiple IDs
  sequence?: string
  ccd?: string
  smiles?: string
  path?: string
  uploadedFile?: File // For file upload
  uploadedFilename?: string // Server filename after upload
  cyclic?: boolean
  binding_types?: string | { binding?: string; not_binding?: string }
  secondary_structure?: string
  include?: Array<{ id: string; res_index?: string }>
  exclude?: Array<{ id: string; res_index?: string }>
  design?: Array<{ id: string; res_index?: string }>
  binding_types_chain?: Array<{ id: string; binding?: string; not_binding?: string }>
  structure_groups?: string | Array<{ visibility: number; id: string; res_index?: string }>
  design_insertions?: Array<{ id: string; res_index: number; num_residues: string; secondary_structure?: string }>
}

interface DesignStepFormProps {
  entities: Entity[]
  onEntitiesChange: (entities: Entity[]) => void
  onValidate?: () => void
}

export function DesignStepForm({ entities, onEntitiesChange, onValidate }: DesignStepFormProps) {
  const [expandedEntity, setExpandedEntity] = useState<number | null>(null)
  const [selectedEntityType, setSelectedEntityType] = useState<'protein' | 'ligand' | 'file' | ''>('')
  // Store refs for file inputs by entity index
  const fileInputRefs = React.useRef<Map<number, HTMLInputElement>>(new Map())
  // Store form state for each file entity
  const [fileFormState, setFileFormState] = useState<Map<number, {
    type: 'include' | 'binding_types'
    chainId: string
    bindingResidues: string
  }>>(new Map())
  
  const getFileInputRef = (index: number) => {
    if (!fileInputRefs.current.has(index)) {
      fileInputRefs.current.set(index, null as any)
    }
    return {
      current: fileInputRefs.current.get(index) || null,
      set: (element: HTMLInputElement | null) => {
        if (element) {
          fileInputRefs.current.set(index, element)
        } else {
          fileInputRefs.current.delete(index)
        }
      }
    }
  }

  const [showAddChainForm, setShowAddChainForm] = useState<Map<number, boolean>>(new Map())

  const getFileFormState = (index: number) => {
    if (!fileFormState.has(index)) {
      setFileFormState(prev => {
        const newMap = new Map(prev)
        newMap.set(index, { type: 'include', chainId: '', bindingResidues: '' })
        return newMap
      })
      return { type: 'include' as const, chainId: '', bindingResidues: '' }
    }
    return fileFormState.get(index)!
  }

  const toggleAddChainForm = (index: number) => {
    setShowAddChainForm(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(index) || false
      newMap.set(index, !current)
      return newMap
    })
  }

  const updateFileFormState = (index: number, updates: Partial<{
    type: 'include' | 'binding_types'
    chainId: string
    bindingResidues: string
  }>) => {
    setFileFormState(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(index) || { type: 'include' as const, chainId: '', bindingResidues: '' }
      newMap.set(index, { ...current, ...updates })
      return newMap
    })
  }

  const addEntity = (type: 'protein' | 'ligand' | 'file') => {
    const newEntity: Entity = { type }
    if (type === 'protein') {
      newEntity.id = 'A'
      newEntity.sequence = ''
    } else if (type === 'ligand') {
      newEntity.id = 'Q'
    } else if (type === 'file') {
      newEntity.path = ''
    }
    onEntitiesChange([...entities, newEntity])
    setExpandedEntity(entities.length)
  }

  const removeEntity = (index: number) => {
    const newEntities = entities.filter((_, i) => i !== index)
    onEntitiesChange(newEntities)
    if (expandedEntity === index) {
      setExpandedEntity(null)
    } else if (expandedEntity !== null && expandedEntity > index) {
      setExpandedEntity(expandedEntity - 1)
    }
  }

  const updateEntity = (index: number, updates: Partial<Entity>) => {
    const newEntities = [...entities]
    newEntities[index] = { ...newEntities[index], ...updates }
    onEntitiesChange(newEntities)
  }

  const toggleExpand = (index: number) => {
    setExpandedEntity(expandedEntity === index ? null : index)
  }

  const renderProteinForm = (entity: Entity, index: number) => {
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs">ID</Label>
          <Input
            value={entity.id || ''}
            onChange={(e) => updateEntity(index, { id: e.target.value })}
            placeholder="e.g., G"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Sequence</Label>
          <Input
            value={entity.sequence || ''}
            onChange={(e) => updateEntity(index, { sequence: e.target.value })}
            placeholder="e.g., 15..20AAAAAAVTTTT18PPP or 3..5C6C3"
            className="h-8 text-xs font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use numbers for design regions (e.g., 15..20), letters for fixed residues
          </p>
        </div>
        <div>
          <Label className="text-xs">Cyclic</Label>
          <Select
            value={entity.cyclic ? 'true' : 'false'}
            onValueChange={(v) => updateEntity(index, { cyclic: v === 'true' })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">False</SelectItem>
              <SelectItem value="true">True</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Binding Types (optional)</Label>
          <Input
            value={typeof entity.binding_types === 'string' ? entity.binding_types : ''}
            onChange={(e) => updateEntity(index, { binding_types: e.target.value })}
            placeholder="e.g., uuuuBBBuNNNuBuu"
            className="h-8 text-xs font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            B = binding, N = non-binding, u = unspecified
          </p>
        </div>
        <div>
          <Label className="text-xs">Secondary Structure (optional)</Label>
          <Input
            value={entity.secondary_structure || ''}
            onChange={(e) => updateEntity(index, { secondary_structure: e.target.value })}
            placeholder="e.g., HHHLLLEEE"
            className="h-8 text-xs font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            H = helix, E = sheet, L = loop
          </p>
        </div>
      </div>
    )
  }

  const renderLigandForm = (entity: Entity, index: number) => {
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs">ID(s)</Label>
          <Input
            value={entity.ids ? entity.ids.join(',') : entity.id || ''}
            onChange={(e) => {
              const value = e.target.value
              if (value.includes(',')) {
                updateEntity(index, { ids: value.split(',').map(s => s.trim()), id: undefined })
              } else {
                updateEntity(index, { id: value, ids: undefined })
              }
            }}
            placeholder="e.g., Q or E, F (for multiple)"
            className="h-8 text-xs font-mono"
          />
        </div>
        <div>
          <Label className="text-xs">CCD Code (optional)</Label>
          <Input
            value={entity.ccd || ''}
            onChange={(e) => updateEntity(index, { ccd: e.target.value, smiles: undefined })}
            placeholder="e.g., WHL"
            className="h-8 text-xs font-mono"
          />
        </div>
        <div>
          <Label className="text-xs">SMILES (optional)</Label>
          <Input
            value={entity.smiles || ''}
            onChange={(e) => updateEntity(index, { smiles: e.target.value, ccd: undefined })}
            placeholder="e.g., N[C@@H](Cc1ccc(O)cc1)C(=O)O"
            className="h-8 text-xs font-mono"
          />
        </div>
        <div>
          <Label className="text-xs">Binding Types (optional)</Label>
          <Input
            value={typeof entity.binding_types === 'string' ? entity.binding_types : ''}
            onChange={(e) => updateEntity(index, { binding_types: e.target.value })}
            placeholder="e.g., B"
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>
    )
  }

  const renderFileForm = (entity: Entity, index: number) => {
    const fileInputRef = getFileInputRef(index)
    const formState = getFileFormState(index)
    
    // Separate chains for include and binding_types
    const includeChains = entity.include || []
    const bindingTypeChains = entity.binding_types_chain || []

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      
      if (!file.name.endsWith('.cif')) {
        alert('Please upload a .cif file')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      // Update UI immediately
      updateEntity(index, { uploadedFile: file, path: file.name })

      try {
        // Upload file to server
        const formData = new FormData()
        formData.append('file', file)

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/v1/upload`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        const data = await response.json()
        
        // Save the server filename
        if (data.files && data.files.length > 0) {
          const serverFilename = data.files[0].file_name
          updateEntity(index, { uploadedFilename: serverFilename })
        }
      } catch (error) {
        console.error('File upload error:', error)
        alert(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
        // Clear the file on error
        updateEntity(index, { uploadedFile: undefined, path: undefined, uploadedFilename: undefined })
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    
    const clearFile = () => {
      updateEntity(index, { uploadedFile: undefined, path: undefined, uploadedFilename: undefined })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    const addChain = () => {
      const chainId = formState.chainId.toUpperCase().trim()
      if (!chainId || chainId.length !== 1) {
        alert('Please enter a single letter for Chain ID')
        return
      }

      if (formState.type === 'include') {
        // Check if chain already exists
        if (includeChains.find(c => c.id === chainId)) {
          alert(`Chain ${chainId} already exists in Include Chains`)
          return
        }
        const newChains = [...includeChains, { id: chainId }]
        updateEntity(index, { include: newChains })
        // Hide form after successfully adding to include chains
        setShowAddChainForm(prev => {
          const newMap = new Map(prev)
          newMap.set(index, false)
          return newMap
        })
      } else {
        // Check if chain already exists
        if (bindingTypeChains.find(c => c.id === chainId)) {
          alert(`Chain ${chainId} already exists in Binding Types`)
          return
        }
        if (!formState.bindingResidues.trim()) {
          alert('Please enter binding residues for binding_types')
          return
        }
        const newChains = [...bindingTypeChains, { id: chainId, binding: formState.bindingResidues.trim() }]
        updateEntity(index, { binding_types_chain: newChains })
        // Hide form after successfully adding to binding types
        setShowAddChainForm(prev => {
          const newMap = new Map(prev)
          newMap.set(index, false)
          return newMap
        })
      }

      // Reset form fields
      updateFileFormState(index, { chainId: '', bindingResidues: '' })
    }

    const removeIncludeChain = (chainIndex: number) => {
      const newChains = includeChains.filter((_, i) => i !== chainIndex)
      updateEntity(index, { include: newChains.length > 0 ? newChains : undefined })
    }

    const removeBindingTypeChain = (chainIndex: number) => {
      const newChains = bindingTypeChains.filter((_, i) => i !== chainIndex)
      updateEntity(index, { binding_types_chain: newChains.length > 0 ? newChains : undefined })
    }

    const updateBindingTypeChain = (chainIndex: number, binding: string) => {
      const newChains = bindingTypeChains.map((chain, i) => 
        i === chainIndex ? { ...chain, binding } : chain
      )
      updateEntity(index, { binding_types_chain: newChains })
    }

    return (
      <div className="space-y-4">
        {/* File Upload */}
        <div>
          <Label className="text-xs">CIF File</Label>
          <div className="mt-2">
            {entity.uploadedFile || entity.path ? (
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <span className="text-xs font-mono flex-1">{entity.uploadedFile?.name || entity.path}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-md p-4 text-center">
                <input
                  ref={(el) => fileInputRef.set(el)}
                  type="file"
                  accept=".cif"
                  onChange={handleFileUpload}
                  className="hidden"
                  id={`file-upload-${index}`}
                />
                <Label
                  htmlFor={`file-upload-${index}`}
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-muted-foreground">.cif files only</span>
                </Label>
              </div>
            )}
          </div>
        </div>

        {/* Add Chain Button and Form */}
        <div>
          {!showAddChainForm.get(index) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleAddChainForm(index)}
              className="h-7 w-full text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Chain
            </Button>
          ) : (
            <div className="p-3 border rounded-md bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Add Chain</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAddChainForm(index)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select 
                  value={formState.type} 
                  onValueChange={(v) => updateFileFormState(index, { type: v as 'include' | 'binding_types' })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="include">include</SelectItem>
                    <SelectItem value="binding_types">binding_types</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Chain ID</Label>
                <Input
                  value={formState.chainId}
                  onChange={(e) => updateFileFormState(index, { chainId: e.target.value.toUpperCase() })}
                  placeholder="e.g., A"
                  className="h-7 text-xs font-mono"
                  maxLength={1}
                />
              </div>
              {formState.type === 'binding_types' && (
                <div>
                  <Label className="text-xs">Binding Residues</Label>
                  <Input
                    value={formState.bindingResidues}
                    onChange={(e) => updateFileFormState(index, { bindingResidues: e.target.value })}
                    placeholder="e.g., 343,344,251"
                    className="h-7 text-xs font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated residue indices
                  </p>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChain}
                className="h-7 w-full text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Chain
              </Button>
            </div>
          )}
        </div>

        {/* Include Chains List */}
        {includeChains.length > 0 && (
          <div>
            <Label className="text-xs font-medium mb-2 block">Include Chains</Label>
            <div className="space-y-2">
              {includeChains.map((chain, chainIndex) => (
                <div key={chainIndex} className="p-2 border rounded-md flex items-center justify-between gap-2">
                  <span className="text-xs font-mono flex-1">Chain {chain.id}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeIncludeChain(chainIndex)}
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Binding Types Chains List */}
        {bindingTypeChains.length > 0 && (
          <div>
            <Label className="text-xs font-medium mb-2 block">Binding Types</Label>
            <div className="space-y-2">
              {bindingTypeChains.map((chain, chainIndex) => (
                <div key={chainIndex} className="p-2 border rounded-md space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono flex-1">Chain {chain.id}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeBindingTypeChain(chainIndex)}
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs">Binding Residues</Label>
                    <Input
                      value={chain.binding || ''}
                      onChange={(e) => updateBindingTypeChain(chainIndex, e.target.value)}
                      placeholder="e.g., 343,344,251"
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Structure Groups */}
        <div>
          <Label className="text-xs">Structure Groups (optional)</Label>
          <Select
            value={typeof entity.structure_groups === 'string' ? entity.structure_groups : 'none'}
            onValueChange={(v) => {
              if (v === 'all') {
                updateEntity(index, { structure_groups: 'all' })
              } else {
                updateEntity(index, { structure_groups: undefined })
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not specified</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Specify which regions should have their structure specified
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h4 className="font-medium text-sm">Entities</h4>
          <p className="text-xs text-muted-foreground">
            Add proteins, ligands, or structure files to your design
          </p>
        </div>
        <div className="flex gap-2">
          <Select 
            value={selectedEntityType} 
            onValueChange={(v) => setSelectedEntityType(v as 'protein' | 'ligand' | 'file')}
          >
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="protein">Protein</SelectItem>
              <SelectItem value="ligand">Ligand</SelectItem>
              <SelectItem value="file">File</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              if (selectedEntityType) {
                addEntity(selectedEntityType)
                setSelectedEntityType('')
              }
            }}
            disabled={!selectedEntityType || expandedEntity !== null}
            className="h-8 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-3 pr-4">
          {entities.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground text-center">
                  No entities added yet. Click "Add..." to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {entities.map((entity, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">
                          {entity.type.charAt(0).toUpperCase() + entity.type.slice(1)} {index + 1}
                          {entity.id && ` (${entity.id})`}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(index)}
                          className="h-6 w-6 p-0"
                        >
                          {expandedEntity === index ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEntity(index)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {expandedEntity === index && (
                    <CardContent className="p-0">
                      <div className="h-[400px] overflow-y-auto overflow-x-hidden">
                        <div className="p-6">
                          {entity.type === 'protein' && renderProteinForm(entity, index)}
                          {entity.type === 'ligand' && renderLigandForm(entity, index)}
                          {entity.type === 'file' && renderFileForm(entity, index)}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Validate Design Button - Only show when entities are added */}
          {entities.length > 0 && (
            <div className="pt-4 border-t">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  // Trigger validation by calling onValidate if provided
                  if (onValidate) {
                    onValidate()
                  }
                }}
                className="w-full h-8 text-xs"
              >
                <CheckCircle2 className="h-3 w-3 mr-2" />
                Validate Design
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Validates the design and syncs with YAML editor
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

