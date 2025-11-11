// Monaco worker configuration for YAML support
export function configureMonacoWorker() {
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
}
