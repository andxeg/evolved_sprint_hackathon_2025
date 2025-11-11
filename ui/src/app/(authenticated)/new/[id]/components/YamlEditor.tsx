'use client'

import { Editor } from '@monaco-editor/react'
import { configureMonacoYaml } from 'monaco-yaml'
import { useTheme } from 'next-themes'
import React, { useEffect,useRef } from 'react'

import vhhConfigSchema from '../schemas/vhh-config-schema.json'
import { configureMonacoWorker } from '../utils/monaco-worker'

interface YamlEditorProps {
  value: string
  onChange: (value: string) => void
  onSave?: () => void
  onReset?: () => void
  isLoading?: boolean
  error?: string | null
}

export function YamlEditor({
  value,
  onChange,
  onSave,
  onReset: _onReset,
  isLoading = false,
  error = null
}: YamlEditorProps) {
  const { theme } = useTheme()
  const editorRef = useRef<any>(null)

  useEffect(() => {
    // Configure Monaco worker for YAML support
    configureMonacoWorker()
  }, [])

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    
    // Configure monaco-yaml with schema validation
    configureMonacoYaml(monaco, {
      enableSchemaRequest: false,
      schemas: [
        {
          uri: 'https://fastfold.ai/schemas/vhh-config.json',
          fileMatch: ['vhh-config.yml', '*.yml', '*.yaml'],
          schema: vhhConfigSchema
        }
      ],
      validate: true,
      completion: true,
      hover: true,
      format: true,
      yamlVersion: '1.2'
    })
    
    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 1.5,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      wordWrap: 'on' as const,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: false,
      renderWhitespace: 'selection',
      renderControlCharacters: false,
      bracketPairColorization: {
        enabled: true
      }
    })

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.()
    })
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value)
    }
  }

  if (isLoading) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden h-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center p-4">
        <p className="text-red-700 dark:text-red-300">
          Error: {error}
        </p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden h-full flex flex-col">
      <Editor
        height="100%"
        language="yaml"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          selectOnLineNumbers: true,
          roundedSelection: false,
          readOnly: false,
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
