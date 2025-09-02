import { translateTextAndObjects } from './translateTextAndObjects'
import type { DeepLService } from './deeplService'

interface CollectionObjType {
  [prop: string]: any
}

export async function deepCompareTranslateAndMerge(
  newOriginalObj: CollectionObjType,
  originalObj: CollectionObjType,
  targetObj: CollectionObjType,
  fields: string[],
  language: string,
  action?: 'create' | 'update',
  onlyMissing?: boolean,
  sourceLanguage?: string,
  settings?: any,
  depth: number = 0, // Add depth parameter to prevent infinite recursion
): Promise<CollectionObjType> {
  // Prevent infinite recursion
  if (depth > 5) {
    console.warn('⚠️ Maximum recursion depth reached, returning original object')
    return newOriginalObj
  }
  // Handle arrays
  if (Array.isArray(newOriginalObj)) {
    return Promise.all(
      newOriginalObj.map((item, index) =>
        deepCompareTranslateAndMerge(
          item,
          originalObj?.[index],
          targetObj?.[index],
          fields,
          language,
          action,
          onlyMissing,
          sourceLanguage,
          settings,
          depth + 1, // Increment depth
        ),
      ),
    )
  }

  // Handle objects
  if (typeof newOriginalObj === 'object' && newOriginalObj !== null) {
    const promises = Object.keys(newOriginalObj).map(async (prop) => {
      // Skip if auto-translate is disabled
      if (newOriginalObj?.noAutoTranslate) return

      if (newOriginalObj.hasOwnProperty(prop)) {
        // Check if this field should be translated
        if (fields.includes(prop)) {
          // Always translate if this is a create action or if onlyMissing is false
          // If onlyMissing is true, only translate if the field is missing or empty
          const shouldTranslate =
            action === 'create' ||
            !onlyMissing ||
            targetObj[prop] === undefined ||
            targetObj[prop] === '' ||
            targetObj[prop] === null

          if (shouldTranslate) {
            console.log(`🌐 Translating field '${prop}' for language '${language}'`)
            try {
              // Use DeepL service for translation
              const deeplService = settings?.deeplService
              if (deeplService) {
                // For simple string fields, translate directly
                if (typeof newOriginalObj[prop] === 'string') {
                  targetObj[prop] = await deeplService.translateText(
                    newOriginalObj[prop],
                    language,
                    sourceLanguage,
                    settings,
                  )
                } else {
                  // For complex objects, use the new translation function
                  const translatedField = await translateTextAndObjects(
                    newOriginalObj,
                    targetObj,
                    [prop],
                    language,
                    action || 'update',
                    onlyMissing || false,
                    sourceLanguage || 'en',
                    settings,
                    deeplService,
                  )

                  // Ensure no circular references
                  try {
                    targetObj[prop] = JSON.parse(JSON.stringify(translatedField))
                  } catch (error) {
                    console.warn(
                      `⚠️ Could not clean translated field ${prop}, using original:`,
                      error,
                    )
                    targetObj[prop] = newOriginalObj[prop]
                  }
                }
              } else {
                console.warn('DeepL service not available, keeping original value')
                targetObj[prop] = newOriginalObj[prop]
              }
            } catch (error) {
              console.error(`Translation failed for field ${prop}:`, error)
              // Keep original value if translation fails
              targetObj[prop] = newOriginalObj[prop]
            }
          }
        }
        // Recursively handle nested objects
        else if (
          typeof newOriginalObj[prop] === 'object' &&
          typeof targetObj[prop] === 'object' &&
          newOriginalObj[prop] !== null &&
          targetObj[prop] !== null &&
          depth < 5 // Limit recursion depth for nested objects
        ) {
          targetObj[prop] = await deepCompareTranslateAndMerge(
            newOriginalObj[prop],
            originalObj?.[prop] || null,
            targetObj[prop] || null,
            fields,
            language,
            action,
            onlyMissing,
            sourceLanguage,
            settings,
            depth + 1, // Increment depth
          )
        }
      }
    })

    await Promise.all(promises)
  }

  return targetObj
}
