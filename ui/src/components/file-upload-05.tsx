import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Cross2Icon } from "@radix-ui/react-icons";
import React, { useRef, useState } from "react";

const MAX_FILE_BYTES = 100 * 1024 * 1024 // 100MB
const ACCEPT = ".cif,.pdb,.pdf,image/*"

export interface FileUpload05Props {
  files: File[]
  onFilesChange: (files: File[]) => void
  error?: string | null
}

export default function FileUpload05({ files, onFilesChange, error }: FileUpload05Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const validateAndAddFiles = (list: FileList | File[]) => {
    const incoming: File[] = []
    const errors: string[] = []

    const asArray: File[] = Array.isArray(list)
      ? list as File[]
      : Array.from(list as FileList)

    for (const f of asArray) {
      if (!f) continue
      if (f.size > MAX_FILE_BYTES) {
        errors.push(`${f.name}: exceeds 100MB limit`)
        continue
      }
      const name = f.name.toLowerCase()
      const allowed = name.endsWith('.cif') || name.endsWith('.pdb') || name.endsWith('.pdf') || f.type.startsWith('image/')
      if (!allowed) {
        errors.push(`${f.name}: unsupported type`)
        continue
      }
      incoming.push(f)
    }

    if (incoming.length) {
      onFilesChange([...
        files,
        ...incoming
      ])
    }
    if (errors.length) {
      alert(errors.join('\n'))
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list) return
    validateAndAddFiles(list)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const removeAt = (idx: number) => {
    const next = files.slice()
    next.splice(idx, 1)
    onFilesChange(next)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const dt = e.dataTransfer
    if (dt && dt.files && dt.files.length) {
      validateAndAddFiles(dt.files)
    }
  }

  const openPicker = () => {
    inputRef.current?.click()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  }

  return (
    <div className="sm:mx-auto sm:max-w-lg flex items-center justify-center p-4 w-full">
      <form onSubmit={(e) => e.preventDefault()} className="w-full">
        <h3 className="text-sm font-semibold text-foreground">Attachments</h3>
        <div
          className={`mt-3 flex justify-center space-x-4 rounded-md border border-dashed border-input px-6 py-6 transition-colors ${isDragging ? 'bg-accent/30' : ''} cursor-pointer`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openPicker}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Upload files"
        >
          <div className="sm:flex sm:items-center sm:gap-x-3">
            <Upload
              className="mx-auto h-8 w-8 text-muted-foreground sm:mx-0 sm:h-6 sm:w-6"
              aria-hidden={true}
            />
            <div className="flex items-center text-sm leading-6 text-foreground">
              <p>Drag and drop or</p>
              <Label
                htmlFor="file-upload-05"
                className="inline-flex items-center cursor-pointer rounded-sm pl-1 font-medium text-primary hover:underline hover:underline-offset-4"
                onClick={(e) => { e.stopPropagation(); openPicker() }}
              >
                <span>choose files</span>
                <input
                  id="file-upload-05"
                  name="file-upload-05"
                  type="file"
                  className="sr-only"
                  accept={ACCEPT}
                  multiple
                  ref={inputRef}
                  onChange={handleFileInput}
                />
              </Label>
              <p className="pl-1">to upload</p>
            </div>
          </div>
        </div>
        <p className="mt-2 flex items-center justify-between text-[11px] leading-5 text-muted-foreground">
          Max size: 100MB per file. Accepted: CIF, PDB, PDF, Images.
        </p>
        {error ? (
          <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <div className="mt-4 space-y-2">
          {files.map((f, idx) => (
            <div key={`${f.name}-${idx}`} className="relative rounded-lg bg-muted p-3">
              <div className="absolute right-1 top-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-sm p-2 text-muted-foreground hover:text-foreground"
                  aria-label="Remove"
                  onClick={() => removeAt(idx)}
                >
                  <Cross2Icon className="size-4 shrink-0" aria-hidden={true} />
                </Button>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-background shadow-sm ring-1 ring-inset ring-input">
                  <FileSpreadsheet
                    className="size-5 text-foreground"
                    aria-hidden={true}
                  />
                </span>
                <div className="w-full">
                  <p className="text-xs font-medium text-foreground truncate" title={f.name}>
                    {f.name}
                  </p>
                  <p className="mt-0.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>{(f.size / (1024 * 1024)).toFixed(2)} MB</span>
                    <span>Pending</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}
