'use client'

import { Editor } from '@monaco-editor/react'
import { configureMonacoYaml } from 'monaco-yaml'
import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

interface YamlViewerProps {
  fileUrl: string
  content: string | null
  isLoading: boolean
  error: string | null
}

export default function YamlViewer({ fileUrl, content, isLoading, error }: YamlViewerProps) {
  const editorRef = useRef<any>(null)

  useEffect(() => {
    // Configure Monaco worker for YAML support
    if (typeof window !== 'undefined') {
      (window as any).MonacoEnvironment = {
        getWorker(moduleId: string, label: string) {
          switch (label) {
            case 'json':
              return new Worker(
                new URL('monaco-editor/esm/vs/language/json/json.worker', import.meta.url)
              )
            case 'css':
            case 'scss':
            case 'less':
              return new Worker(
                new URL('monaco-editor/esm/vs/language/css/css.worker', import.meta.url)
              )
            case 'html':
            case 'handlebars':
            case 'razor':
              return new Worker(
                new URL('monaco-editor/esm/vs/language/html/html.worker', import.meta.url)
              )
            case 'typescript':
            case 'javascript':
              return new Worker(
                new URL('monaco-editor/esm/vs/language/typescript/ts.worker', import.meta.url)
              )
            case 'yaml':
              return new Worker(
                new URL('monaco-yaml/yaml.worker', import.meta.url)
              )
            default:
              return new Worker(
                new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url)
              )
          }
        }
      }
    }
  }, [])

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    
    // Configure monaco-yaml (without schema validation for read-only viewer)
    configureMonacoYaml(monaco, {
      enableSchemaRequest: false,
      validate: false,
      completion: false,
      hover: false,
      format: false,
      yamlVersion: '1.2'
    })
    
    // Configure editor options for read-only mode
    editor.updateOptions({
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 1.5,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      wordWrap: 'on' as const,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: false,
      readOnly: true,
      renderWhitespace: 'selection',
      renderControlCharacters: false,
      bracketPairColorization: {
        enabled: true
      }
    })
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center border rounded-lg bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center border rounded-lg bg-background">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="w-full h-full flex items-center justify-center border rounded-lg bg-background">
        <p className="text-muted-foreground">No content available</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full border rounded-lg bg-background overflow-hidden">
      <Editor
        height="100%"
        language="yaml"
        value={content}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          selectOnLineNumbers: true,
          roundedSelection: false,
          readOnly: true,
          cursorStyle: 'line',
          automaticLayout: true,
          contextmenu: true,
          mouseWheelZoom: true,
          smoothScrolling: true,
          cursorBlinking: 'blink',
          cursorSmoothCaretAnimation: 'on' as const,
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'always',
          unfoldOnClickAfterEndOfLine: false,
          minimap: { enabled: true },
          bracketPairColorization: {
            enabled: true
          },
          guides: {
            bracketPairs: true,
            indentation: true
          }
        }}
      />
    </div>
  )
}

