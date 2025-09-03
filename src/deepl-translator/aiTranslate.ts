import type { CollectionOptions, DeepLTranslationSettings } from './types'
import { DeepLService } from './deeplService'

/**
 * Process RichText nodes recursively for translation
 */
async function processRichTextNode(
  node: any,
  deeplService: DeepLService,
  targetLanguage: string,
  sourceLanguage: string,
  settings: DeepLTranslationSettings,
): Promise<void> {
  try {
    // Handle text nodes
    if (node.type === 'text' && node.text && node.text.trim()) {
      try {
        const translatedText = await deeplService.translateText(
          node.text,
          targetLanguage,
          sourceLanguage,
          settings,
        )
        node.text = translatedText
      } catch (error) {
        console.error(`Failed to translate text: "${node.text}"`, error)
      }
      return
    }

    // Handle nodes with children
    if (node.children && Array.isArray(node.children)) {
      for (const childNode of node.children) {
        await processRichTextNode(childNode, deeplService, targetLanguage, sourceLanguage, settings)
      }
    }
  } catch (error) {
    console.error('Error processing richText node:', error)
  }
}

export async function translateCollection({
  req,
  doc,
  collection,
  collectionOptions,
  codes,
  settings,
  sourceLanguage,
}: {
  req: any
  doc: any
  collection: any
  collectionOptions: CollectionOptions
  codes?: string[]
  settings?: DeepLTranslationSettings
  sourceLanguage?: string
}) {
  const sourceLanguageI =
    sourceLanguage || doc.sourceLanguage || req.payload.config.localization?.defaultLocale || 'en'

  // Get available locales
  const localCodes: string[] = req.payload.config.localization?.localeCodes || ['en']

  // Initialize DeepL service
  const deeplService = new DeepLService({
    deeplApiKey: process.env.DEEPL_API_KEY,
  })

  const translationPromises = localCodes
    .filter(
      (targetLanguage) =>
        targetLanguage !== sourceLanguageI && (!codes || codes.includes(targetLanguage)),
    )
    .map(async (targetLanguage: string) => {
      try {
        const targetDoc = await req.payload.findByID({
          collection: collection.slug,
          id: doc.id,
          locale: targetLanguage,
          fallbackLocale: false,
          limit: 0,
          depth: 0,
        })

        const dataForUpdate: any = {}

        // Translate each field individually
        for (const fieldName of collectionOptions.fields) {
          if (doc[fieldName]) {
            try {
              if (typeof doc[fieldName] === 'string') {
                // Simple string field
                const originalText = doc[fieldName]
                const translatedText = await deeplService.translateText(
                  originalText,
                  targetLanguage,
                  sourceLanguageI,
                  settings || {},
                )
                dataForUpdate[fieldName] = translatedText
              } else if (
                doc[fieldName] &&
                typeof doc[fieldName] === 'object' &&
                doc[fieldName].root
              ) {
                // RichText field
                try {
                  const richTextContent = doc[fieldName]

                  if (richTextContent.root && richTextContent.root.children) {
                    // Create a deep copy of the structure
                    const cleanRichText = JSON.parse(JSON.stringify(richTextContent))

                    // Process each child element recursively
                    for (const child of cleanRichText.root.children) {
                      await processRichTextNode(
                        child,
                        deeplService,
                        targetLanguage,
                        sourceLanguageI,
                        settings || {},
                      )
                    }

                    dataForUpdate[fieldName] = cleanRichText
                  } else {
                    // Fallback: keep original structure
                    dataForUpdate[fieldName] = { ...doc[fieldName] }
                  }
                } catch (error) {
                  console.error(`Failed to process RichText field ${fieldName}:`, error)
                  dataForUpdate[fieldName] = { ...doc[fieldName] }
                }
              }
            } catch (error) {
              console.error(`Translation failed for field ${fieldName}:`, error)
              dataForUpdate[fieldName] = doc[fieldName]
            }
          }
        }

        return { dataNew: dataForUpdate, targetLanguage }
      } catch (error) {
        console.error(`Translation failed for locale ${targetLanguage}:`, error)
        return null
      }
    })

  const translationResults = await Promise.all(translationPromises)
  const validResults = translationResults.filter((result) => result !== null)

  for (const translatedContent of validResults) {
    if (translatedContent) {
      try {
        const existingDoc = await req.payload.findByID({
          collection: collection.slug,
          id: doc.id,
          locale: translatedContent.targetLanguage,
          fallbackLocale: false,
        })

        // Clean the data to remove any circular references
        const cleanData = { ...translatedContent.dataNew }

        // For RichText fields, ensure they don't have circular references
        for (const key in cleanData) {
          if (cleanData[key] && typeof cleanData[key] === 'object' && cleanData[key].root) {
            try {
              cleanData[key] = JSON.parse(JSON.stringify(cleanData[key]))
            } catch (error) {
              console.warn(`Could not clean RichText field ${key}, using original:`, error)
              const originalField = doc[key]
              if (originalField && typeof originalField === 'object' && originalField.root) {
                cleanData[key] = {
                  root: {
                    children: originalField.root.children || [],
                  },
                }
              }
            }
          }
        }

        if (existingDoc) {
          // Update existing document
          await req.payload.update({
            collection: collection.slug,
            id: doc.id,
            data: cleanData,
            locale: translatedContent.targetLanguage,
            depth: 0,
            overrideAccess: true,
            context: {
              skipTranslate: true,
              skipSlug: true,
            },
          })
        } else {
          // Create new localized document
          await req.payload.create({
            collection: collection.slug,
            data: {
              ...cleanData,
              _status: 'draft',
            },
            locale: translatedContent.targetLanguage,
            depth: 0,
            overrideAccess: true,
            context: {
              skipTranslate: true,
              skipSlug: true,
            },
          })
        }
      } catch (error) {
        console.error(
          `Failed to update translation for locale ${translatedContent.targetLanguage}:`,
          error,
        )
      }
    }
  }
}
