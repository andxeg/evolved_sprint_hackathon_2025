"use client";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type PipelineJobConfigProps = {
  pipelineName: string;
  setPipelineName: (v: string) => void;
  editPipelineName: boolean;
  setEditPipelineName: (v: boolean) => void;
  generatePipelineName: () => string;
  gpuType: string;
  setGpuType: (v: string) => void;
  protocol: string;
  setProtocol: (v: string) => void;
  numDesigns: string;
  setNumDesigns: (v: string) => void;
  budget: string;
  setBudget: (v: string) => void;
};

export default function PipelineJobConfig({
  pipelineName,
  setPipelineName,
  editPipelineName,
  setEditPipelineName,
  generatePipelineName,
  gpuType,
  setGpuType,
  protocol,
  setProtocol,
  numDesigns,
  setNumDesigns,
  budget,
  setBudget,
}: PipelineJobConfigProps) {
  return (
    <div className="space-y-4">
      {/* Pipeline Name Row */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="pipelineName" className="text-sm font-medium">
            Pipeline Name
          </Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="edit-pipeline-name"
              checked={editPipelineName}
              onCheckedChange={(checked) => {
                setEditPipelineName(checked);
                if (checked) {
                  setPipelineName(generatePipelineName());
                }
              }}
            />
            <Label htmlFor="edit-pipeline-name" className="text-xs text-gray-600">
              Edit name
            </Label>
          </div>
        </div>
        <Input
          id="pipelineName"
          value={pipelineName}
          onChange={(e) => setPipelineName(e.target.value)}
          placeholder="Enter pipeline name"
          disabled={!editPipelineName}
        />
      </div>

      {/* Protocol Row */}
      <div>
        <Label htmlFor="protocol" className="text-sm font-medium">
          Protocol
        </Label>
        <div className="mt-2">
          <Select value={protocol} onValueChange={setProtocol}>
            <SelectTrigger>
              <SelectValue placeholder="Select protocol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="protein-anything">protein-anything</SelectItem>
              <SelectItem value="peptide-anything">peptide-anything</SelectItem>
              <SelectItem value="protein-small_molecule">protein-small_molecule</SelectItem>
              <SelectItem value="nanobody-anything">nanobody-anything</SelectItem>
            </SelectContent>
          </Select>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            {protocol === 'protein-anything' && (
              <p>Design proteins to bind proteins or peptides. Includes design folding step.</p>
            )}
            {protocol === 'peptide-anything' && (
              <p>Design (cyclic) peptides or others to bind proteins. No Cys in inverse folding. No design folding step.</p>
            )}
            {protocol === 'protein-small_molecule' && (
              <p>Design proteins to bind small molecules. Includes binding affinity prediction and design folding step.</p>
            )}
            {protocol === 'nanobody-anything' && (
              <p>Design nanobodies (single-domain antibodies). No Cys in inverse folding. No design folding step.</p>
            )}
          </div>
        </div>
      </div>

      {/* Number of Designs and Budget Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="numDesigns" className="text-sm font-medium">
            Designs
          </Label>
          <div className="mt-2">
            <Input
              id="numDesigns"
              type="number"
              value={numDesigns}
              onChange={(e) => setNumDesigns(e.target.value)}
              placeholder="e.g., 10"
              min="1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Total designs to generate.
            </p>
          </div>
        </div>
        <div>
          <Label htmlFor="budget" className="text-sm font-medium">
            Budget
          </Label>
          <div className="mt-2">
            <Input
              id="budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g., 2"
              min="1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Final diversity optimized set size.
            </p>
          </div>
        </div>
      </div>

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
  );
}
