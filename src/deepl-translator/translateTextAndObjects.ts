import { DeepLService } from './deeplService'
import ISO6391 from 'iso-639-1'

function isoToFullName(isoCode: string, settings: any): string {
  const foundLanguage = settings.localization?.locales?.find((item: any) => item.code === isoCode)
  if (foundLanguage && foundLanguage.label.length > 2) {
    return foundLanguage.label
  }
  if (ISO6391.getName(isoCode)) return ISO6391.getName(isoCode)

  console.log('Language not found for code:', isoCode)
  return isoCode
}

function messagesMarkdown({ sourceLanguage, text, language, settings }: any) {
  return [
    {
      role: 'user',
      parts: [
        `You will be provided with markdown in "${isoToFullName(
          sourceLanguage,
          settings,
        )}", and your task is to translate it into the language: "${isoToFullName(
          language,
          settings,
        )}". Only return the translated markdown (mdx) and keep the structure.\n\n${text}`,
      ],
    },
  ]
}

function messagesString({ sourceLanguage, text, language, settings }: any) {
  return [
    {
      role: 'user',
      parts: [
        `You will be provided with text in "${isoToFullName(
          sourceLanguage,
          settings,
        )}", and your task is to translate it into the language:"${isoToFullName(
          language,
          settings,
        )}". Only return the translated text without anything else.\n\n${text}`,
      ],
    },
  ]
}

function messagesWithJson({ sourceLanguage, text, language, settings }: any) {
  return [
    {
      role: 'user',
      parts: [
        `You will be provided with lexical json structure in "${isoToFullName(
          sourceLanguage,
          settings,
        )}", and your task is to translate it into the language "${isoToFullName(
          language,
          settings,
        )}". Keep the json structure. Make sure NOT to wrap your result in markdown.\n\n${JSON.stringify(text)}`,
      ],
    },
  ]
}

function messagesWithJsonLexical({ sourceLanguage, text, language, settings }: any) {
  return [
    {
      role: 'user',
      parts: [
        `You will be provided with a flat object structure with long keys in the language "${isoToFullName(
          sourceLanguage,
          settings,
        )}", and your task is to translate it into the language "${isoToFullName(
          language,
          settings,
        )}". Keep the flat json object structure with long dot separated keys. Make sure NOT to wrap your result in markdown.\n\n${JSON.stringify(text)}`,
      ],
    },
  ]
}

function promptDefault({ messages }: any): any {
  return messages
}

function extractAndCapitalizeText(
  node: any,
  path: any,
  textMap: any,
  isTargetProperty: (node: any, key: string) => boolean,
) {
  if (node !== null && typeof node === 'object') {
    Object.keys(node).forEach((key) => {
      if (isTargetProperty(node, key)) {
        const keyPath = path.concat([key]).join('.')
        textMap[keyPath] = node[key]
      } else {
        extractAndCapitalizeText(node[key], path.concat([key]), textMap, isTargetProperty)
      }
    })
  }
}

function reapplyText(
  node: any,
  path: any,
  textMap: any,
  isTargetProperty: (node: any, key: string) => boolean,
) {
  if (node !== null && typeof node === 'object') {
    Object.keys(node).forEach((key) => {
      if (isTargetProperty(node, key)) {
        const keyPath = path.concat([key]).join('.')
        if (textMap[keyPath] !== undefined) {
          node[key] = textMap[keyPath]
        }
      } else {
        reapplyText(node[key], path.concat([key]), textMap, isTargetProperty)
      }
    })
  }
}

export async function translateTextAndObjects(
  sourceDoc: any,
  targetDoc: any,
  fields: string[],
  targetLanguage: string,
  operation: string,
  onlyMissing: boolean,
  sourceLanguage: string,
  settings: any,
  deeplService: DeepLService,
) {
  const textMap: { [key: string]: string } = {}
  const textsToTranslate: { [key: string]: string } = {}

  // Extract text from source document
  fields.forEach((field) => {
    if (sourceDoc[field]) {
      if (typeof sourceDoc[field] === 'string') {
        const keyPath = field
        const sourceText = sourceDoc[field]
        const targetText = targetDoc[field]

        if (!onlyMissing || !targetText || targetText === sourceText) {
          textsToTranslate[keyPath] = sourceText
        }
      } else if (typeof sourceDoc[field] === 'object' && sourceDoc[field] !== null) {
        extractAndCapitalizeText(
          sourceDoc[field],
          [field],
          textsToTranslate,
          (node: any, key: string) => typeof node[key] === 'string',
        )
      }
    }
  })

  if (Object.keys(textsToTranslate).length === 0) {
    console.log('No texts to translate')
    return targetDoc
  }

  console.log(
    `🌐 Translating ${Object.keys(textsToTranslate).length} text fields to ${targetLanguage}`,
  )

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

    console.log('✅ Translation completed successfully')
  } catch (error) {
    console.error('❌ Translation failed:', error)
    throw error
  }

  // Reapply translated texts to target document
  fields.forEach((field) => {
    if (sourceDoc[field]) {
      if (typeof sourceDoc[field] === 'string') {
        const keyPath = field
        if (textMap[keyPath]) {
          targetDoc[field] = textMap[keyPath]
        }
      } else if (typeof sourceDoc[field] === 'object' && sourceDoc[field] !== null) {
        reapplyText(
          targetDoc[field] || sourceDoc[field],
          [field],
          textMap,
          (node: any, key: string) => typeof node[key] === 'string',
        )
      }
    }
  })

  return targetDoc
}
