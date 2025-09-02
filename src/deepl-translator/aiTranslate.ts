import type { CollectionAfterChangeHook } from 'payload'
import { deepCompareTranslateAndMerge } from './deepCompareAndMerge'
import { PluginTypes, CollectionOptions } from './types'
import { DeepLService } from './deeplService'

const aiTranslateHook =
  ({
    collectionOptions,
    collection,
    pluginOptions,
  }: {
    collectionOptions: CollectionOptions
    collection: any
    pluginOptions: PluginTypes
  }): CollectionAfterChangeHook =>
  async ({ doc, req, previousDoc, context, collection }) => {
    const settings = pluginOptions.collections?.[collection.slug]?.settings

    return await translateCollection({
      doc,
      req,
      previousDoc,
      context,
      collection,
      collectionOptions,
      settings,
    })
  }

export default aiTranslateHook

// Recursive function to process richText nodes (like in translationService.ts)
async function processRichTextNode(
  node: any,
  deeplService: any,
  targetLanguage: string,
  sourceLanguage: string,
  settings: any,
): Promise<void> {
  try {
    // Handle text nodes
    if (node.type === 'text' && node.text && node.text.trim()) {
      try {
        // Translate the text using DeepL API
        const translatedText = await deeplService.translateText(
          node.text,
          targetLanguage,
          sourceLanguage,
          settings,
        )
        node.text = translatedText
        console.log(`🌐 Text translated: "${node.text}" -> "${translatedText}"`)
      } catch (error) {
        console.error(`❌ Failed to translate text: "${node.text}"`, error)
        // Keep original text if translation fails
        node.text = node.text
      }
      return
    }

    // Handle nodes with children (paragraphs, headings, lists, etc.)
    if (node.children && Array.isArray(node.children)) {
      for (let j = 0; j < node.children.length; j++) {
        const childNode = node.children[j]
        await processRichTextNode(childNode, deeplService, targetLanguage, sourceLanguage, settings)
      }
    }

    // Handle list items specifically (they might have nested structure)
    if (node.type === 'listitem' && node.children) {
      for (let j = 0; j < node.children.length; j++) {
        const listItemChild = node.children[j]
        await processRichTextNode(
          listItemChild,
          deeplService,
          targetLanguage,
          sourceLanguage,
          settings,
        )
      }
    }

    // Handle custom elements that might have text in different properties
    if (node.type === 'heading' && node.children) {
      for (let j = 0; j < node.children.length; j++) {
        const headingChild = node.children[j]
        await processRichTextNode(
          headingChild,
          deeplService,
          targetLanguage,
          sourceLanguage,
          settings,
        )
      }
    }
  } catch (error) {
    console.error(`❌ Error processing richText node:`, error)
  }
}

export async function translateCollection({
  req,
  doc,
  collection,
  previousDoc,
  context,
  collectionOptions,
  onlyMissing,
  codes,
  settings,
  sourceLanguage,
}: {
  req: any
  doc: any
  collection: any
  previousDoc: any
  context: any
  collectionOptions: CollectionOptions
  onlyMissing?: boolean
  codes?: string[]
  settings?: any
  sourceLanguage?: string
}) {
  console.log('🚀 Starting translation process...')
  console.log('  - Document ID:', doc?.id)
  console.log('  - Collection:', collection?.slug)
  console.log('  - Context flags:', {
    triggerAfterChange: context.triggerAfterChange,
    skipHooks: context.skipHooks,
    isTranslationUpdate: context.isTranslationUpdate,
  })

  // Skip if this is a recursive update
  // But allow translation updates (isTranslationUpdate: true) to proceed
  if (context.triggerAfterChange === false && !context.isTranslationUpdate) {
    console.log('🔄 Skipping translation due to context flags:', {
      triggerAfterChange: context.triggerAfterChange,
      skipHooks: context.skipHooks,
      isTranslationUpdate: context.isTranslationUpdate,
    })
    return
  }

  // Additional check to prevent recursion during document updates
  if (context.skipTranslate === true) {
    console.log('🔄 Skipping translation due to skipTranslate flag')
    return
  }

  // Check if we're already in a translation process
  if (context.isTranslationUpdate === true && context.skipTranslate === true) {
    console.log('🔄 Skipping translation due to skipTranslate flag in translation update')
    return
  }

  console.log('✅ Translation allowed to proceed')
  console.log(
    '  - Reason: triggerAfterChange =',
    context.triggerAfterChange,
    'OR isTranslationUpdate =',
    context.isTranslationUpdate,
  )

  const sourceLanguageI =
    sourceLanguage || doc.sourceLanguage || req.payload.config.localization?.defaultLocale || 'en'

  // Get available locales
  const localCodes: string[] = req.payload.config.localization?.localeCodes || ['en']
  console.log('🌍 Available locales:', localCodes)
  console.log('  - Source language:', sourceLanguageI)
  console.log(
    '  - Target languages:',
    localCodes.filter((lang) => lang !== sourceLanguageI),
  )

  // Initialize DeepL service
  console.log('🔧 DeepL settings:', {
    hasApiKey: !!process.env.DEEPL_API_KEY,
  })

  const deeplService = new DeepLService({
    collections: req.payload.config.collections || {},
    deeplApiKey: process.env.DEEPL_API_KEY,
  })

  console.log('📝 Fields to translate:', collectionOptions.fields)

  const translationPromises = localCodes
    .filter(
      (targetLanguage) =>
        targetLanguage !== sourceLanguageI && (!codes || codes.includes(targetLanguage)),
    )
    .map(async (tL: string) => {
      console.log(`🔄 Starting translation for locale: ${tL}`)
      try {
        const targetDoc = await req.payload.findByID({
          collection: collection.slug,
          id: doc.id,
          locale: tL,
          fallbackLocale: false,
          limit: 0,
          depth: 0,
        })

        // Create simple data object like in translationService.ts
        const dataForUpdate: any = {}

        console.log(`🔍 Translating fields for locale ${tL}:`, collectionOptions.fields)

        // Translate each field individually
        for (const fieldName of collectionOptions.fields) {
          if (doc[fieldName]) {
            try {
              if (typeof doc[fieldName] === 'string') {
                // Simple string field
                const originalText = doc[fieldName]
                const translatedText = await deeplService.translateText(
                  originalText,
                  tL,
                  sourceLanguageI,
                  settings,
                )
                dataForUpdate[fieldName] = translatedText
                console.log(
                  `✅ Field '${fieldName}' translated: "${originalText}" -> "${translatedText}"`,
                )
              } else if (
                doc[fieldName] &&
                typeof doc[fieldName] === 'object' &&
                doc[fieldName].root
              ) {
                // RichText field - use simple approach like translationService.ts
                try {
                  // Extract text content from RichText
                  const richTextContent = doc[fieldName]
                  console.log(`🔍 RichText structure for ${fieldName}:`, {
                    hasRoot: !!richTextContent.root,
                    rootType: typeof richTextContent.root,
                    hasChildren: !!richTextContent.root?.children,
                    childrenType: typeof richTextContent.root?.children,
                    childrenLength: richTextContent.root?.children?.length,
                    firstChild: richTextContent.root?.children?.[0],
                  })

                  if (richTextContent.root && richTextContent.root.children) {
                    // Use the same approach as translationService.ts - recursive processing
                    console.log(
                      `🔍 Processing RichText with ${richTextContent.root.children.length} root children`,
                    )

                    // Create a deep copy of the structure (like translationService.ts)
                    const cleanRichText = JSON.parse(JSON.stringify(richTextContent))

                    // Process each child element recursively (like translationService.ts)
                    console.log(
                      `🔄 Starting recursive translation for ${cleanRichText.root.children.length} root elements...`,
                    )
                    for (let i = 0; i < cleanRichText.root.children.length; i++) {
                      const child = cleanRichText.root.children[i]
                      console.log(
                        `🔍 Processing root element ${i + 1}/${cleanRichText.root.children.length}: type=${child.type}`,
                      )
                      await processRichTextNode(child, deeplService, tL, sourceLanguageI, settings)
                    }

                    console.log(`✅ RichText structure processed recursively`)

                    dataForUpdate[fieldName] = cleanRichText
                    console.log(
                      `✅ RichText field '${fieldName}' structure preserved for locale ${tL}`,
                    )

                    // Simple logging like in translationService.ts
                    console.log(`🔍 Clean RichText structure:`, {
                      hasRoot: !!cleanRichText.root,
                      hasChildren: !!cleanRichText.root?.children,
                      childrenLength: cleanRichText.root?.children?.length,
                      firstChildType: cleanRichText.root?.children?.[0]?.type,
                    })
                  } else {
                    // Fallback: keep original structure
                    dataForUpdate[fieldName] = { ...doc[fieldName] }
                    console.log(
                      `⚠️ RichText field '${fieldName}' structure preserved (fallback) for locale ${tL}`,
                    )
                  }
                } catch (error) {
                  console.error(`Failed to process RichText field ${fieldName}:`, error)
                  // Keep original if processing fails
                  dataForUpdate[fieldName] = { ...doc[fieldName] }
                }
              }
            } catch (error) {
              console.error(`Translation failed for field ${fieldName}:`, error)
              dataForUpdate[fieldName] = doc[fieldName] // Keep original if translation fails
            }
          }
        }

        console.log(`📋 Final data for locale ${tL}:`, Object.keys(dataForUpdate))
        return { dataNew: dataForUpdate, tL }
      } catch (error) {
        console.error(`Translation failed for locale ${tL}:`, error)
        return null
      }
    })

  const translationResults = await Promise.all(translationPromises)
  const validResults = translationResults.filter((result) => result !== null)

  for (const translatedContent of validResults) {
    if (translatedContent) {
      try {
        console.log(`🔄 Updating document for locale ${translatedContent.tL}...`)
        console.log(`📝 Data to update keys:`, Object.keys(translatedContent.dataNew))
        console.log(
          `📝 Data to update values:`,
          Object.keys(translatedContent.dataNew).map((key) => ({
            key,
            type: typeof translatedContent.dataNew[key],
            hasRoot: translatedContent.dataNew[key]?.root ? 'RichText' : 'Simple',
          })),
        )

        // Use createOrUpdate to avoid triggering hooks
        const existingDoc = await (req as any).payload.findByID({
          collection: collection.slug,
          id: doc.id,
          locale: translatedContent.tL,
          fallbackLocale: false,
        })

        // Clean the data to remove any circular references
        const cleanData = { ...translatedContent.dataNew }

        // For RichText fields, ensure they don't have circular references
        for (const key in cleanData) {
          if (cleanData[key] && typeof cleanData[key] === 'object' && cleanData[key].root) {
            // Create a clean copy of RichText structure
            try {
              cleanData[key] = JSON.parse(JSON.stringify(cleanData[key]))
            } catch (error) {
              console.warn(`⚠️ Could not clean RichText field ${key}, using original:`, error)
              // If we can't clean it, try to extract just the essential structure
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

        console.log(`🧹 Cleaned data keys:`, Object.keys(cleanData))

        if (existingDoc) {
          // Update existing document - use same approach as translationService.ts
          await (req as any).payload.update({
            collection: collection.slug,
            id: doc.id,
            data: cleanData,
            locale: translatedContent.tL,
            depth: 0,
            overrideAccess: true,
            context: {
              skipTranslate: true,
              skipSlug: true,
            },
          })
        } else {
          // Create new localized document - use same approach as translationService.ts
          await (req as any).payload.create({
            collection: collection.slug,
            data: {
              ...cleanData,
              _status: 'draft', // Set as draft by default
            },
            locale: translatedContent.tL,
            depth: 0,
            overrideAccess: true,
            context: {
              skipTranslate: true,
              skipSlug: true,
            },
          })
        }

        console.log(`✅ Successfully updated document for locale ${translatedContent.tL}`)
      } catch (error) {
        console.error(`❌ Failed to update translation for locale ${translatedContent.tL}:`, error)
      }
    }
  }
}
