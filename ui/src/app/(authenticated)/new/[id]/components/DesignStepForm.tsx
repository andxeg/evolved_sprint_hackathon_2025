'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import React, { useState } from 'react'

export interface Entity {
  type: 'protein' | 'ligand' | 'file'
  id?: string
  ids?: string[] // For ligands with multiple IDs
  sequence?: string
  ccd?: string
  smiles?: string
  path?: string
  cyclic?: boolean
  binding_types?: string | { binding?: string; not_binding?: string }
  secondary_structure?: string
  include?: Array<{ id: string; res_index?: string }>
  exclude?: Array<{ id: string; res_index?: string }>
  design?: Array<{ id: string; res_index?: string }>
  binding_types_chain?: Array<{ id: string; binding?: string; not_binding?: string }>
  structure_groups?: Array<{ visibility: number; id: string; res_index?: string }>
  design_insertions?: Array<{ id: string; res_index: number; num_residues: string; secondary_structure?: string }>
}

interface DesignStepFormProps {
  entities: Entity[]
  onEntitiesChange: (entities: Entity[]) => void
}

export function DesignStepForm({ entities, onEntitiesChange }: DesignStepFormProps) {
  const [expandedEntity, setExpandedEntity] = useState<number | null>(null)

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
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Path</Label>
          <Input
            value={entity.path || ''}
            onChange={(e) => updateEntity(index, { path: e.target.value })}
            placeholder="e.g., 7rpz.cif or hard_targets/6m1u.cif"
            className="h-8 text-xs font-mono"
          />
        </div>
        <div>
          <Label className="text-xs">Include Chains (optional)</Label>
          <Textarea
            value={entity.include?.map(c => `chain: ${c.id}${c.res_index ? `, res_index: ${c.res_index}` : ''}`).join('\n') || ''}
            onChange={(e) => {
              const lines = e.target.value.split('\n').filter(l => l.trim())
              const include = lines.map(line => {
                const match = line.match(/chain:\s*(\w+)(?:,\s*res_index:\s*(.+))?/)
                if (match) {
                  return { id: match[1], res_index: match[2] || undefined }
                }
                return { id: line.trim() }
              })
              updateEntity(index, { include })
            }}
            placeholder="chain: A&#10;chain: B, res_index: 2..50"
            className="min-h-[60px] text-xs font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Format: chain: A or chain: A, res_index: 2..50,55..
          </p>
        </div>
        <div>
          <Label className="text-xs">Exclude Chains (optional)</Label>
          <Textarea
            value={entity.exclude?.map(c => `chain: ${c.id}${c.res_index ? `, res_index: ${c.res_index}` : ''}`).join('\n') || ''}
            onChange={(e) => {
              const lines = e.target.value.split('\n').filter(l => l.trim())
              const exclude = lines.map(line => {
                const match = line.match(/chain:\s*(\w+)(?:,\s*res_index:\s*(.+))?/)
                if (match) {
                  return { id: match[1], res_index: match[2] || undefined }
                }
                return { id: line.trim() }
              })
              updateEntity(index, { exclude })
            }}
            placeholder="chain: A, res_index: ..5"
            className="min-h-[60px] text-xs font-mono"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">Entities</h4>
          <p className="text-xs text-muted-foreground">
            Add proteins, ligands, or structure files to your design
          </p>
        </div>
        <div className="flex gap-2">
          <Select onValueChange={(v) => addEntity(v as 'protein' | 'ligand' | 'file')}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue placeholder="Add..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="protein">Protein</SelectItem>
              <SelectItem value="ligand">Ligand</SelectItem>
              <SelectItem value="file">File</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
                <CardContent>
                  {entity.type === 'protein' && renderProteinForm(entity, index)}
                  {entity.type === 'ligand' && renderLigandForm(entity, index)}
                  {entity.type === 'file' && renderFileForm(entity, index)}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

