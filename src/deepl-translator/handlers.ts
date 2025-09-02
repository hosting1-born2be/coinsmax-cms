import { validateAccess } from './access'
import { translateCollection } from './aiTranslate'
import { PluginTypes } from './types'
import { PayloadHandler } from 'payload'

export const createTranslatorHandler = (pluginOptions: PluginTypes): PayloadHandler => {
  return async (req) => {
    try {
      // Get collection slug from URL parameters since we're using /collections/:collectionSlug/translate
      const urlParts = (req as any).url?.split('/') || []
      const collectionSlug = urlParts[urlParts.length - 2] // /api/collections/insights/translate -> insights

      // Alternative: try to get from req.params if available
      const paramsCollectionSlug = (req as any).params?.collectionSlug
      const finalCollectionSlug = paramsCollectionSlug || collectionSlug

      if (!finalCollectionSlug) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Collection not found in URL',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      // Try to get request body - in Payload CMS v3 it might be available in different ways
      let requestBody = {}

      // Method 1: Try req.body
      if ((req as any).body && Object.keys((req as any).body).length > 0) {
        requestBody = (req as any).body
      }
      // Method 2: Try req.json() if available
      else if (typeof (req as any).json === 'function') {
        try {
          requestBody = await (req as any).json()
        } catch (e) {
          console.log('req.json() failed:', e)
        }
      }
      // Method 3: Try to parse from URL search params or other sources
      else {
        console.log('⚠️ Request body not available through standard methods')
        // Try to get from URL search params as fallback
        const url = new URL((req as any).url)
        const id = url.searchParams.get('id')
        const locale = url.searchParams.get('locale')
        if (id && locale) {
          requestBody = { id, locale }
        }
      }

      console.log('🔍 Translation handler debug info:')
      console.log('  - Collection slug:', finalCollectionSlug)
      console.log('  - Document ID:', (requestBody as any).id)
      console.log('  - Source locale:', (requestBody as any).locale)
      console.log('  - Request body:', JSON.stringify(requestBody, null, 2))
      console.log('  - Request URL:', (req as any).url)
      console.log('  - Request method:', (req as any).method)
      console.log('  - Request headers:', (req as any).headers)
      console.log('  - Full request object keys:', Object.keys(req as any))

      const doc = await (req as any).payload.findByID({
        collection: finalCollectionSlug,
        id: (requestBody as any).id,
        locale: (requestBody as any).locale,
      })

      console.log('📄 Document lookup result:')
      console.log('  - Document found:', !!doc)
      console.log('  - Document ID:', doc?.id)
      console.log('  - Document title:', doc?.title)

      if (!doc) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Document not found',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      const collectionOptions = pluginOptions.collections[finalCollectionSlug]
      if (!collectionOptions) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Collection not configured for translation',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      if (!validateAccess(req, null, pluginOptions, finalCollectionSlug)) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Access denied',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      const settings = {
        ...((requestBody as any).settings || {}),
        ...collectionOptions.settings,
      }

      await translateCollection({
        doc,
        req,
        previousDoc: {},
        context: {
          triggerAfterChange: true, // Allow translation to proceed
          skipHooks: false, // Allow hooks for translation
          isTranslationUpdate: true, // Mark this as a translation update
        },
        collectionOptions,
        collection: { slug: finalCollectionSlug },
        onlyMissing: false, // Always translate all fields, even if they already exist
        codes: (requestBody as any).codes,
        sourceLanguage: (requestBody as any).locale,
        settings: { ...settings },
      })

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Translation completed successfully',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      console.error('Translation handler error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Translation failed',
          error: String(error),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }
}

export const createMissingTranslatorHandler = (pluginOptions: PluginTypes): PayloadHandler => {
  return async (req) => {
    try {
      // Get collection slug from URL parameters since we're using /collections/:collectionSlug/translate
      const urlParts = (req as any).url?.split('/') || []
      const collectionSlug = urlParts[urlParts.length - 2] // /api/collections/insights/translate -> insights

      // Alternative: try to get from req.params if available
      const paramsCollectionSlug = (req as any).params?.collectionSlug
      const finalCollectionSlug = paramsCollectionSlug || collectionSlug

      if (!finalCollectionSlug) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Collection not found in URL',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      if (!validateAccess(req, null, pluginOptions, finalCollectionSlug)) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Access denied',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      const allDocs = await (req as any).payload.find({
        collection: finalCollectionSlug,
        locale: (req as any).body.locale,
        limit: 10000,
      })

      if (!allDocs?.docs) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'No documents found',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      console.log('Translating all docs:', allDocs.docs.length)

      for (const singleDoc of allDocs.docs) {
        try {
          const doc = await (req as any).payload.findByID({
            collection: finalCollectionSlug,
            id: singleDoc.id,
            locale: singleDoc.sourceLanguage || (req as any).body.locale,
          })

          const collectionOptions = pluginOptions.collections[finalCollectionSlug]
          const settings = {
            ...((req as any).body.settings || {}),
            ...collectionOptions.settings,
          }

          await translateCollection({
            doc,
            req,
            previousDoc: {},
            context: {
              triggerAfterChange: true, // Allow translation to proceed
              skipHooks: false, // Allow hooks for translation
              isTranslationUpdate: true, // Mark this as a translation update
            },
            collectionOptions,
            collection: { slug: finalCollectionSlug },
            onlyMissing: false, // Always translate all fields, even if they already exist
            codes: (req as any).body.codes,
            sourceLanguage: doc.sourceLanguage || (req as any).body.locale,
            settings: { ...settings },
          })
        } catch (error) {
          console.error(`Failed to translate document ${singleDoc.id}:`, error)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Bulk translation completed',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      console.error('Bulk translation handler error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Bulk translation failed',
          error: String(error),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }
}

export const generateTextHandler = (pluginOptions: PluginTypes): PayloadHandler => {
  return async (req) => {
    try {
      if (!validateAccess(req, null, pluginOptions, 'system')) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Access denied',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      const { generateText } = await import('./generateText')
      const requestBody = (req as any).body || {}
      const result = await generateText({
        ...requestBody,
        settings: {
          ...requestBody.settings,
        },
      })
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Generate text handler error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Text generation failed',
          error: String(error),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }
}
