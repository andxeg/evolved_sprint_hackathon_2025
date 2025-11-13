'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Upload } from 'lucide-react'
import React from 'react'

export type BinderTarget = {
  name: string
  pdbPath?: string
  uploadedFilename?: string
  chain: string
}

export type BinderDesignRegion = {
  chain: string
  residues: string
}

export type BinderScaffold = {
  pdbPath?: string
  uploadedFilename?: string
  chains: string[]
  design_regions: BinderDesignRegion[]
}

export type BinderFormState = {
  projectType: string
  targetsPositive: BinderTarget[]
  targetsNegative: BinderTarget[]
  scaffold: BinderScaffold
}

type BinderDesignFormProps = {
  pipelineName: string
  form: BinderFormState
  onChange: (form: BinderFormState) => void
  onUploadFile: (file: File) => Promise<string> // returns uploaded filename
}

export function BinderDesignForm({ pipelineName, form, onChange, onUploadFile }: BinderDesignFormProps) {
  const update = (updates: Partial<BinderFormState>) => onChange({ ...form, ...updates })

  const addTarget = (kind: 'positive' | 'negative') => {
    const list = kind === 'positive' ? form.targetsPositive : form.targetsNegative
    const newItem: BinderTarget = { name: '', chain: '' }
    if (kind === 'positive') update({ targetsPositive: [...list, newItem] })
    else update({ targetsNegative: [...list, newItem] })
  }

  const removeTarget = (kind: 'positive' | 'negative', index: number) => {
    const list = kind === 'positive' ? form.targetsPositive : form.targetsNegative
    const newList = list.filter((_, i) => i !== index)
    if (kind === 'positive') update({ targetsPositive: newList })
    else update({ targetsNegative: newList })
  }

  const updateTarget = (kind: 'positive' | 'negative', index: number, updates: Partial<BinderTarget>) => {
    const list = kind === 'positive' ? form.targetsPositive : form.targetsNegative
    const newList = [...list]
    newList[index] = { ...newList[index], ...updates }
    if (kind === 'positive') update({ targetsPositive: newList })
    else update({ targetsNegative: newList })
  }

  const handleTargetUpload = async (kind: 'positive' | 'negative', index: number, file: File) => {
    const uploaded = await onUploadFile(file)
    updateTarget(kind, index, { uploadedFilename: uploaded, pdbPath: file.name })
  }

  const addDesignRegion = () => {
    update({
      scaffold: {
        ...form.scaffold,
        design_regions: [...form.scaffold.design_regions, { chain: '', residues: '' }]
      }
    })
  }

  const removeDesignRegion = (index: number) => {
    const newList = form.scaffold.design_regions.filter((_, i) => i !== index)
    update({ scaffold: { ...form.scaffold, design_regions: newList } })
  }

  const updateDesignRegion = (index: number, updates: Partial<BinderDesignRegion>) => {
    const newList = [...form.scaffold.design_regions]
    newList[index] = { ...newList[index], ...updates }
    update({ scaffold: { ...form.scaffold, design_regions: newList } })
  }

  const handleScaffoldUpload = async (file: File) => {
    const uploaded = await onUploadFile(file)
    update({ scaffold: { ...form.scaffold, uploadedFilename: uploaded, pdbPath: file.name } })
  }

  const setChainsFromString = (value: string) => {
    const chains = value
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
    update({ scaffold: { ...form.scaffold, chains } })
  }

  return (
    <div className="space-y-4">
      {/* Project (name comes from pipelineName; hidden) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Project type</Label>
          <Select value={form.projectType} onValueChange={(v) => update({ projectType: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="existing_binder">existing_binder</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Project name</Label>
          <Input value={pipelineName} disabled className="h-8 text-xs" />
        </div>
      </div>

      {/* Targets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Positive targets</Label>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => addTarget('positive')}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {form.targetsPositive.map((t, i) => (
            <div key={`p-${i}`} className="p-2 border rounded-md space-y-2">
              {/* Row: Name + Chain + Remove */}
              <div className="flex items-center gap-2">
                <Input
                  value={t.name}
                  onChange={(e) => updateTarget('positive', i, { name: e.target.value })}
                  placeholder="name e.g., CXCR4"
                  className="h-8 text-xs flex-1"
                />
                <Input
                  value={t.chain}
                  onChange={(e) => updateTarget('positive', i, { chain: e.target.value })}
                  placeholder="chain e.g., R"
                  className="h-8 text-xs w-28"
                />
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => removeTarget('positive', i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {/* Row: Upload (or filename when uploaded) */}
              <div>
                {t.uploadedFilename ? (
                  <div className="text-xs text-gray-500 font-mono truncate">{t.uploadedFilename}</div>
                ) : (
                  <label className="h-8 px-2 border rounded text-xs inline-flex items-center gap-1 cursor-pointer">
                    <Upload className="h-3 w-3" />
                    Upload PDB
                    <input
                      type="file"
                      accept=".pdb"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void handleTargetUpload('positive', i, file)
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Negative targets</Label>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => addTarget('negative')}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {form.targetsNegative.map((t, i) => (
            <div key={`n-${i}`} className="p-2 border rounded-md space-y-2">
              {/* Row: Name + Chain + Remove */}
              <div className="flex items-center gap-2">
                <Input
                  value={t.name}
                  onChange={(e) => updateTarget('negative', i, { name: e.target.value })}
                  placeholder="name e.g., CCR5"
                  className="h-8 text-xs flex-1"
                />
                <Input
                  value={t.chain}
                  onChange={(e) => updateTarget('negative', i, { chain: e.target.value })}
                  placeholder="chain e.g., A"
                  className="h-8 text-xs w-28"
                />
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => removeTarget('negative', i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {/* Row: Upload (or filename when uploaded) */}
              <div>
                {t.uploadedFilename ? (
                  <div className="text-xs text-gray-500 font-mono truncate">{t.uploadedFilename}</div>
                ) : (
                  <label className="h-8 px-2 border rounded text-xs inline-flex items-center gap-1 cursor-pointer">
                    <Upload className="h-3 w-3" />
                    Upload PDB
                    <input
                      type="file"
                      accept=".pdb"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void handleTargetUpload('negative', i, file)
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scaffold */}
      <div className="space-y-3">
        <Label className="text-xs">Scaffold</Label>
        <div className="space-y-2">
          {/* Upload row and filename with remove */}
          <div className="flex items-center gap-2">
            {form.scaffold.uploadedFilename ? (
              <>
                <div className="text-xs text-gray-500 font-mono truncate">{form.scaffold.uploadedFilename}</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive"
                  onClick={() =>
                    update({ scaffold: { ...form.scaffold, pdbPath: '', uploadedFilename: undefined } })
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <label className="h-8 px-2 border rounded text-xs inline-flex items-center gap-1 cursor-pointer">
                <Upload className="h-3 w-3" />
                Upload PDB
                <input
                  type="file"
                  accept=".pdb"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleScaffoldUpload(file)
                  }}
                />
              </label>
            )}
          </div>
          {/* Chains in a separate row */}
          <div className="flex items-center gap-2">
            <Label className="text-xs">Chains</Label>
            <Input
              value={form.scaffold.chains.join(',')}
              onChange={(e) => setChainsFromString(e.target.value)}
              placeholder="e.g., H,L"
              className="h-8 text-xs w-40"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Design regions</Label>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addDesignRegion}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          {form.scaffold.design_regions.map((dr, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-center">
              <Input
                value={dr.chain}
                onChange={(e) => updateDesignRegion(i, { chain: e.target.value })}
                placeholder='chain e.g., "H"'
                className="h-8 text-xs"
              />
              <Input
                value={dr.residues}
                onChange={(e) => updateDesignRegion(i, { residues: e.target.value })}
                placeholder='residues e.g., "26-35,50-65,95-102"'
                className="h-8 text-xs"
              />
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => removeDesignRegion(i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


