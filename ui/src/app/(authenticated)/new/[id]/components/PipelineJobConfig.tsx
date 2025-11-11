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
};

export default function PipelineJobConfig({
  pipelineName,
  setPipelineName,
  editPipelineName,
  setEditPipelineName,
  generatePipelineName,
  gpuType,
  setGpuType,
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
