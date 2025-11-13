"use client";

import * as React from "react";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type BoltzgenWorkflowConfigProps = {
  protocol: string;
  setProtocol: (v: string) => void;
  numDesigns: string;
  setNumDesigns: (v: string) => void;
  budget: string;
  setBudget: (v: string) => void;
};

export default function BoltzgenWorkflowConfig({
  protocol,
  setProtocol,
  numDesigns,
  setNumDesigns,
  budget,
  setBudget,
}: BoltzgenWorkflowConfigProps) {
  return (
    <div className="space-y-4">
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

      {/* Design Parameters */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Design Parameters</Label>
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
      </div>
    </div>
  );
}

