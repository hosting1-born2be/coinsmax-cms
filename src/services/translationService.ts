import type { CollectionSlug } from 'payload'
import payload from 'payload'

// DeepL API configuration
const DEEPL_API_KEY = process.env.DEEPL_API_KEY
const DEEPL_API_URL = process.env.DEEPL_API_URL || 'https://api.deepl.com/v2/translate'

// Function to translate text using DeepL API
async function translateText(text: string, targetLang: string = 'LT'): Promise<string> {
  if (!DEEPL_API_KEY) {
    console.warn('⚠️ DeepL API key not configured')
    return text
  }

  if (!text || text.trim().length === 0) {
    return text
  }

  try {
    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text,
        target_lang: targetLang.toUpperCase(),
        source_lang: 'EN',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepL API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.translations[0].text
  } catch (error) {
    console.error('❌ Translation error:', error)
    return text
  }
}

// Main function to handle document translation
export async function handleDocumentTranslation(
  doc: any,
  collection: CollectionSlug,
  operation: 'create' | 'update',
  req: Request,
): Promise<void> {
  try {
    console.log('🚀 TRANSLATION SERVICE STARTED')

    // Перевіряємо, чи doc існує і має необхідні властивості
    if (!doc || !doc.id) {
      console.error('❌ Document is undefined or missing ID:', doc)
      return
    }

    console.log('📄 Document received:', { id: doc.id, title: doc.title })

    // Define all fields to translate
    const fieldsToTranslate = ['title', 'excerpt', 'content', 'seo_title', 'seo_description']

    // Process each field
    for (const fieldName of fieldsToTranslate) {
      await processFieldTranslation(doc, fieldName)
    }

    console.log('✅ TRANSLATION SERVICE COMPLETED')

    // Post final translated object to API
    await postTranslatedObject(doc, collection, req)
  } catch (error) {
    console.error('❌ Translation service error:', error)
  }
}

// Function to create final translated object
function createFinalTranslatedObject(originalDoc: any): any {
  return {
    id: originalDoc.id,
    title: originalDoc.translations?.title || originalDoc.title,
    slug: originalDoc.slug,
    image: originalDoc.image,
    excerpt: originalDoc.translations?.excerpt || originalDoc.excerpt,
    content: originalDoc.translations?.content || originalDoc.content,
    seo_title: originalDoc.translations?.seo_title || originalDoc.seo_title,
    seo_description: originalDoc.translations?.seo_description || originalDoc.seo_description,
    updatedAt: originalDoc.updatedAt,
    createdAt: originalDoc.createdAt,
  }
}

// Function to extract plain text from richText structure
function extractTextFromRichText(richText: any): string {
  if (!richText || !richText.root || !richText.root.children) {
    return ''
  }

  let plainText = ''

  function processNode(node: any) {
    if (node.type === 'text' && node.text) {
      plainText += node.text + ' '
    }

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(processNode)
    }
  }

  richText.root.children.forEach(processNode)

  return plainText.trim()
}

// Function to translate richText structure paragraph by paragraph
async function translateRichTextStructure(richText: any): Promise<any> {
  if (!richText || !richText.root || !richText.root.children) {
    return richText
  }

  // Create a deep copy of the structure
  const translatedStructure = JSON.parse(JSON.stringify(richText))

  // Process each child (paragraph/heading) separately
  for (let i = 0; i < translatedStructure.root.children.length; i++) {
    const child = translatedStructure.root.children[i]

    if (child.children && Array.isArray(child.children)) {
      for (let j = 0; j < child.children.length; j++) {
        const textNode = child.children[j]

        if (textNode.type === 'text' && textNode.text && textNode.text.trim()) {
          try {
            const translatedText = await translateText(textNode.text, 'LT')
            textNode.text = translatedText
          } catch (error) {
            console.error(`❌ Error translating text node ${i}-${j}:`, error)
          }
        }
      }
    }
  }

  return translatedStructure
}

// Function to process translation for a specific field
async function processFieldTranslation(doc: any, fieldName: string): Promise<void> {
  try {
    // Перевіряємо, чи doc існує
    if (!doc) {
      console.error(`❌ Document is undefined for field ${fieldName}`)
      return
    }

    // Extract text to translate
    let textToTranslate: string | undefined

    if (typeof doc[fieldName] === 'string') {
      textToTranslate = doc[fieldName]
    } else if (doc[fieldName] && typeof doc[fieldName] === 'object' && doc[fieldName].en) {
      textToTranslate = doc[fieldName].en
    } else if (
      doc[fieldName] &&
      typeof doc[fieldName] === 'object' &&
      (doc[fieldName] as any).root
    ) {
      textToTranslate = doc[fieldName] as any
    } else if (doc[fieldName] && typeof doc[fieldName] === 'object') {
      return
    } else {
      return
    }

    // Handle richText content field specially
    if (
      fieldName === 'content' &&
      typeof textToTranslate === 'object' &&
      (textToTranslate as any).root
    ) {
      const translatedRichText = await translateRichTextStructure(textToTranslate as any)

      if (!doc.translations) doc.translations = {}
      doc.translations[fieldName] = translatedRichText
      return
    }

    // Check if text is empty or too long
    if (
      !textToTranslate ||
      (typeof textToTranslate === 'string' && textToTranslate.trim().length === 0)
    ) {
      return
    }

    if (typeof textToTranslate === 'string' && textToTranslate.length > 1000) {
      return
    }

    // Translate the text
    const translatedText = await translateText(textToTranslate, 'LT')

    if (translatedText === textToTranslate) {
      return
    }

    // Store translation
    if (!doc.translations) doc.translations = {}
    doc.translations[fieldName] = translatedText
  } catch (error) {
    console.error(`❌ Error processing ${fieldName}:`, error)
  }
}

// Function to post translated object to API
// Function to post translated object to API
async function postTranslatedObject(
  doc: any,
  collection: CollectionSlug,
  req: Request,
): Promise<void> {
  try {
    const finalObject = createFinalTranslatedObject(doc)

    const dataForLT = {
      title: finalObject.title,
      excerpt: finalObject.excerpt,
      content: finalObject.content,
      seo_title: finalObject.seo_title,
      seo_description: finalObject.seo_description,
    }

    console.log('📤 Translated data ready for API:', dataForLT)

    // ✅ use the initialized instance
    await (req as any).payload.update({
      collection,
      id: doc.id,
      data: dataForLT,
      locale: 'lt',
      depth: 0,
      overrideAccess: true,
      context: {
        skipTranslate: true,
        skipSlug: true,
      },
    })

    console.log('✅ Translation data prepared successfully')
  } catch (error) {
    console.error('❌ Error preparing translation data:', error)
  }
}
