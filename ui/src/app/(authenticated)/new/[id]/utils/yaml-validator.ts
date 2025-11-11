import yaml from 'js-yaml'

import vhhConfigSchema from '../schemas/vhh-config-schema.json'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export function validateYamlContent(yamlContent: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Parse YAML content
    const parsed = yaml.load(yamlContent) as any

    if (!parsed || typeof parsed !== 'object') {
      errors.push('Invalid YAML format')
      return { isValid: false, errors, warnings }
    }

    const actualTopLevelKeys = Object.keys(parsed)

    // Check if this is a design spec format (has entities key)
    const isDesignSpec = actualTopLevelKeys.includes('entities')
    
    if (isDesignSpec) {
      // Validate design spec format
      const allowedDesignSpecKeys = ['entities', 'constraints']
      const extraKeys = actualTopLevelKeys.filter(key => !allowedDesignSpecKeys.includes(key))
      if (extraKeys.length > 0) {
        errors.push(`Invalid top-level keys found: ${extraKeys.join(', ')}. Only these keys are allowed: ${allowedDesignSpecKeys.join(', ')}`)
      }

      // Validate entities
      if (parsed.entities) {
        if (!Array.isArray(parsed.entities)) {
          errors.push('entities must be an array')
        } else {
          // Basic validation for entities
          parsed.entities.forEach((entity: any, index: number) => {
            if (!entity || typeof entity !== 'object') {
              errors.push(`Entity at index ${index} must be an object`)
              return
            }
            
            const entityTypes = ['protein', 'ligand', 'file']
            const entityType = entityTypes.find(type => entity[type] !== undefined)
            
            if (!entityType) {
              errors.push(`Entity at index ${index} must have one of: ${entityTypes.join(', ')}`)
            }
          })
        }
      }

      // Validate constraints (optional)
      if (parsed.constraints && !Array.isArray(parsed.constraints)) {
        errors.push('constraints must be an array')
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    }

    // Old format validation (template_config, etc.)
    const allowedTopLevelKeys = Object.keys(vhhConfigSchema.properties || {})

    // Find extra keys
    const extraKeys = actualTopLevelKeys.filter(key => !allowedTopLevelKeys.includes(key))
    if (extraKeys.length > 0) {
      errors.push(`Invalid top-level keys found: ${extraKeys.join(', ')}. Only these keys are allowed: ${allowedTopLevelKeys.join(', ')}`)
    }

    // Check for missing required keys
    const requiredKeys = vhhConfigSchema.required || []
    const missingKeys = requiredKeys.filter(key => !actualTopLevelKeys.includes(key))
    if (missingKeys.length > 0) {
      errors.push(`Missing required keys: ${missingKeys.join(', ')}`)
    }

    // Validate each section
    for (const [sectionName, sectionData] of Object.entries(parsed)) {
      if (typeof sectionData !== 'object' || sectionData === null) {
        errors.push(`Section '${sectionName}' must be an object`)
        continue
      }

      const sectionSchema = (vhhConfigSchema.properties as any)?.[sectionName]
      if (!sectionSchema || !sectionSchema.properties) {
        continue
      }

      const allowedKeys = Object.keys(sectionSchema.properties)
      const actualKeys = Object.keys(sectionData)

      // Check for extra keys in section
      const extraSectionKeys = actualKeys.filter(key => !allowedKeys.includes(key))
      if (extraSectionKeys.length > 0) {
        errors.push(`Invalid keys in '${sectionName}': ${extraSectionKeys.join(', ')}. Allowed keys: ${allowedKeys.join(', ')}`)
      }

      // Check for missing required keys in section
      const requiredSectionKeys = sectionSchema.required || []
      const missingSectionKeys = requiredSectionKeys.filter((key: string) => !actualKeys.includes(key))
      if (missingSectionKeys.length > 0) {
        errors.push(`Missing required keys in '${sectionName}': ${missingSectionKeys.join(', ')}`)
      }

      // Validate specific field types and values
      for (const [fieldName, fieldValue] of Object.entries(sectionData)) {
        const fieldSchema = (sectionSchema.properties as any)[fieldName]
        if (!fieldSchema) continue

        const fieldErrors = validateFieldValue(fieldName, fieldValue, fieldSchema)
        errors.push(...fieldErrors)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }

  } catch (error) {
    errors.push(`YAML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { isValid: false, errors, warnings }
  }
}

function validateFieldValue(fieldName: string, value: any, schema: any): string[] {
  const errors: string[] = []

  // Type validation
  if (Array.isArray(schema.type)) {
    // Handle union types like ["number", "null"]
    const validTypes = schema.type.map((t: string) => {
      if (t === 'null') return 'null'
      if (t === 'number') return 'number'
      if (t === 'integer') return 'number' // integers are numbers in JavaScript
      if (t === 'string') return 'string'
      if (t === 'boolean') return 'boolean'
      return t
    })
    
    const actualType = value === null ? 'null' : typeof value
    if (!validTypes.includes(actualType)) {
      errors.push(`Field '${fieldName}' must be one of: ${schema.type.join(', ')}`)
    }
  } else {
    // Handle single types
    if (schema.type === 'string' && typeof value !== 'string') {
      errors.push(`Field '${fieldName}' must be a string`)
    } else if (schema.type === 'number' && typeof value !== 'number') {
      errors.push(`Field '${fieldName}' must be a number`)
    } else if (schema.type === 'integer' && (!Number.isInteger(value) || typeof value !== 'number')) {
      errors.push(`Field '${fieldName}' must be an integer`)
    } else if (schema.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`Field '${fieldName}' must be a boolean`)
    } else if (schema.type === 'null' && value !== null) {
      errors.push(`Field '${fieldName}' must be null`)
    }
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`Field '${fieldName}' must be one of: ${schema.enum.join(', ')}`)
  }

  // Range validation (only for non-null numeric values)
  if (typeof value === 'number' && value !== null) {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`Field '${fieldName}' must be >= ${schema.minimum}`)
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`Field '${fieldName}' must be <= ${schema.maximum}`)
    }
  }

  return errors
}

export function sanitizeYamlContent(yamlContent: string): string {
  try {
    const parsed = yaml.load(yamlContent) as any
    if (!parsed || typeof parsed !== 'object') {
      return yamlContent
    }

    // Remove extra properties not in schema
    const allowedTopLevelKeys = Object.keys(vhhConfigSchema.properties || {})
    const sanitized: any = {}

    for (const key of allowedTopLevelKeys) {
      if (parsed[key] !== undefined) {
        sanitized[key] = parsed[key]
      }
    }

    return yaml.dump(sanitized, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
      quotingType: '"',
      forceQuotes: false,
      noCompatMode: true
    })
  } catch (error) {
    return yamlContent
  }
}

export function validateAndCleanYamlContent(yamlContent: string): { content: string; isValid: boolean; errors: string[] } {
  const validation = validateYamlContent(yamlContent)
  
  if (validation.isValid) {
    // If valid, return original content to preserve comments and formatting
    return { content: yamlContent, isValid: true, errors: [] }
  } else {
    // If invalid, try to sanitize but warn about potential formatting loss
    const sanitized = sanitizeYamlContent(yamlContent)
    return { 
      content: sanitized, 
      isValid: true, 
      errors: ['Content has been sanitized. Comments and formatting may be lost.'] 
    }
  }
}
