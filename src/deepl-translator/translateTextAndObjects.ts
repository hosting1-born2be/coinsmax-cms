import { DeepLService } from './deeplService'
import type { DeepLTranslationSettings } from './types'

/**
 * Extract text content from nested objects recursively
 */
function extractTextFromObject(obj: any, path: string[], textMap: { [key: string]: string }): void {
  if (obj !== null && typeof obj === 'object') {
    Object.keys(obj).forEach((key) => {
      const currentPath = [...path, key]
      const value = obj[key]

      if (typeof value === 'string' && value.trim()) {
        textMap[currentPath.join('.')] = value
      } else if (typeof value === 'object' && value !== null) {
        extractTextFromObject(value, currentPath, textMap)
      }
    })
  }
}

/**
 * Apply translated text back to nested objects recursively
 */
function applyTranslatedText(obj: any, path: string[], textMap: { [key: string]: string }): void {
  if (obj !== null && typeof obj === 'object') {
    Object.keys(obj).forEach((key) => {
      const currentPath = [...path, key]
      const value = obj[key]

      if (typeof value === 'string') {
        const textKey = currentPath.join('.')
        if (textMap[textKey]) {
          obj[key] = textMap[textKey]
        }
      } else if (typeof value === 'object' && value !== null) {
        applyTranslatedText(value, currentPath, textMap)
      }
    })
  }
}

export async function translateTextAndObjects(
  sourceDoc: any,
  targetDoc: any,
  fields: string[],
  targetLanguage: string,
  sourceLanguage: string,
  settings: DeepLTranslationSettings,
  deeplService: DeepLService,
): Promise<any> {
  const textMap: { [key: string]: string } = {}
  const textsToTranslate: { [key: string]: string } = {}

  // Extract text from source document
  fields.forEach((field) => {
    if (sourceDoc[field]) {
      if (typeof sourceDoc[field] === 'string') {
        textsToTranslate[field] = sourceDoc[field]
      } else if (typeof sourceDoc[field] === 'object' && sourceDoc[field] !== null) {
        extractTextFromObject(sourceDoc[field], [field], textsToTranslate)
      }
    }
  })

  if (Object.keys(textsToTranslate).length === 0) {
    return targetDoc
  }

  // Translate all texts using DeepL
  try {
    const texts = Object.values(textsToTranslate)
    const translatedTexts = await deeplService.translateBatch(
      texts,
      targetLanguage,
      sourceLanguage,
      settings,
    )

    // Map translated texts back to their paths
    const textPaths = Object.keys(textsToTranslate)
    textPaths.forEach((path, index) => {
      textMap[path] = translatedTexts[index]
    })
  } catch (error) {
    console.error('Translation failed:', error)
    throw error
  }

  // Apply translated texts to target document
  fields.forEach((field) => {
    if (sourceDoc[field]) {
      if (typeof sourceDoc[field] === 'string') {
        if (textMap[field]) {
          targetDoc[field] = textMap[field]
        }
      } else if (typeof sourceDoc[field] === 'object' && sourceDoc[field] !== null) {
        applyTranslatedText(targetDoc[field] || sourceDoc[field], [field], textMap)
      }
    }
  })

  return targetDoc
}
