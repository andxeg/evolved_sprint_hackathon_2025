"use client";

import * as React from "react";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

type PipelineJobConfigProps = {
  pipelineName: string;
  setPipelineName: (v: string) => void;
  editPipelineName: boolean;
  setEditPipelineName: (v: boolean) => void;
  generatePipelineName: () => string;
  gpuType: string;
  setGpuType: (v: string) => void;
  operatingMode?: string;
  // Binder optimization props
  numDesigns?: string;
  setNumDesigns?: (v: string) => void;
  budget?: string;
  setBudget?: (v: string) => void;
  // Binder optimization props
  binderLength?: string;
  setBinderLength?: (v: string) => void;
  binderType?: string;
  setBinderType?: (v: string) => void;
  numCandidates?: string;
  setNumCandidates?: (v: string) => void;
  affinityWeight?: string;
  setAffinityWeight?: (v: string) => void;
  selectivityWeight?: string;
  setSelectivityWeight?: (v: string) => void;
  propertiesWeight?: string;
  setPropertiesWeight?: (v: string) => void;
  multiObjective?: boolean;
  setMultiObjective?: (v: boolean) => void;
};

export default function PipelineJobConfig({
  pipelineName,
  setPipelineName,
  editPipelineName,
  setEditPipelineName,
  generatePipelineName,
  gpuType,
  setGpuType,
  operatingMode = 'standard',
  numDesigns = '100',
  setNumDesigns,
  budget = '50',
  setBudget,
  binderLength = '110-130',
  setBinderLength,
  binderType = 'nanobody',
  setBinderType,
  numCandidates = '30',
  setNumCandidates,
  affinityWeight = '0.6',
  setAffinityWeight,
  selectivityWeight = '0.3',
  setSelectivityWeight,
  propertiesWeight = '0.1',
  setPropertiesWeight,
  multiObjective = true,
  setMultiObjective,
}: PipelineJobConfigProps) {
  const isBinderOptimization = operatingMode === 'binder-optimization';

  return (
    <ScrollArea className="h-[calc(100vh-12rem)] max-h-[150px] w-full">
      <div className="space-y-4 pr-4">
      {/* Pipeline Name Row */}
      <div>
        <Label htmlFor="pipelineName" className="text-sm font-medium mb-2 block">
          Pipeline Name
        </Label>
        <Input
          id="pipelineName"
          value={pipelineName}
          onChange={(e) => setPipelineName(e.target.value)}
          placeholder="Enter pipeline name"
        />
      </div>

      {/* Binder Specification (for de_novo mode only) */}
      {isBinderOptimization && setBinderLength && setBinderType && (
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-semibold">Binder Specification</Label>
          <div className="space-y-3">
            <div>
              <Label htmlFor="binderLength" className="text-xs font-medium">
                Length
              </Label>
              <Input
                id="binderLength"
                value={binderLength}
                onChange={(e) => setBinderLength(e.target.value)}
                placeholder="e.g., 110-130"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Length range for nanobody
              </p>
            </div>
            <div>
              <Label htmlFor="binderType" className="text-xs font-medium">
                Type
              </Label>
              <Select value={binderType} onValueChange={setBinderType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nanobody">nanobody</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Binder type
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Design Parameters (for binder optimization only) */}
      {isBinderOptimization && setNumDesigns && setBudget && (
        <div className="space-y-3 pt-1 ">
          <Label className="text-sm font-semibold">Design Parameters</Label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="numDesigns" className="text-xs font-medium">
                Designs
              </Label>
              <Input
                id="numDesigns"
                type="number"
                value={numDesigns}
                onChange={(e) => setNumDesigns(e.target.value)}
                placeholder="e.g., 100"
                min="50"
                max="2000"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Total designs to generate (50-2000)
              </p>
            </div>
            {setNumCandidates && (
              <div>
                <Label htmlFor="numCandidates" className="text-xs font-medium">
                  Candidates
                </Label>
                <Input
                  id="numCandidates"
                  type="number"
                  value={numCandidates}
                  onChange={(e) => setNumCandidates(e.target.value)}
                  placeholder="e.g., 30"
                  min="10"
                  max="100"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Top N for selectivity scoring (10-100)
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="budget" className="text-xs font-medium">
                Budget
              </Label>
              <Input
                id="budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g., 50"
                min="20"
                max="100"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                BoltzGen sampling budget (20-100)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scoring Configuration (for binder optimization only) */}
      {isBinderOptimization && setAffinityWeight && setSelectivityWeight && setPropertiesWeight && setMultiObjective && (
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-semibold">Scoring Configuration</Label>
          <div className="space-y-3">
            <div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="affinityWeight" className="text-xs font-medium">
                    affinity
                  </Label>
                  <Input
                    id="affinityWeight"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={affinityWeight}
                    onChange={(e) => setAffinityWeight(e.target.value)}
                    placeholder="e.g., 0.6"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Primary target binding weight (0.0-1.0)
                  </p>
                </div>
                <div>
                  <Label htmlFor="selectivityWeight" className="text-xs font-medium">
                    selectivity
                  </Label>
                  <Input
                    id="selectivityWeight"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={selectivityWeight}
                    onChange={(e) => setSelectivityWeight(e.target.value)}
                    placeholder="e.g., 0.3"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Off-target avoidance weight (0.0-1.0)
                  </p>
                </div>
                <div>
                  <Label htmlFor="propertiesWeight" className="text-xs font-medium">
                    properties
                  </Label>
                  <Input
                    id="propertiesWeight"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={propertiesWeight}
                    onChange={(e) => setPropertiesWeight(e.target.value)}
                    placeholder="e.g., 0.1"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Biophysical properties weight (0.0-1.0)
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="multiObjective" className="text-xs font-medium">
                  multi_objective
                </Label>
                <Switch
                  id="multiObjective"
                  checked={multiObjective}
                  onCheckedChange={setMultiObjective}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enable Pareto ranking
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GPU Type Row */}
      <div>
        <Label className="text-sm font-medium">GPU Type</Label>
        <div className="mt-2">
          <Select value={gpuType} onValueChange={setGpuType}>
            <SelectTrigger>
              <SelectValue placeholder="Select GPU type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="8x H100 Nebius">8x H100 Nebius</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      </div>
    </ScrollArea>
  );
}
