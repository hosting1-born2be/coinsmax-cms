import type { CollectionConfig } from 'payload'
import slugify from 'slugify'
import { handleDocumentTranslation } from '../services/translationService'

export const Insights: CollectionConfig = {
  slug: 'insights',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Insight Title',
      required: false, // Changed from true to false
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Slug',
      unique: true,
      hooks: {
        beforeChange: [
          async ({ data, operation }) => {
            // Only generate slug on create or when title is a string (not localized object)
            if (operation === 'create' && data?.title && typeof data.title === 'string') {
              return slugify(data.title, { lower: true, strict: true })
            }

            // For updates, don't change the slug if title is a localized object
            if (operation === 'update') {
              // If title is a localized object, don't regenerate slug
              if (data?.title && typeof data.title === 'object') {
                return undefined // Keep existing slug
              }

              // If title is a string, generate new slug
              if (data?.title && typeof data.title === 'string') {
                return slugify(data.title, { lower: true, strict: true })
              }
            }

            return undefined
          },
        ],
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Image',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'excerpt',
      type: 'text',
      label: 'Excerpt',
      localized: true,
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Content',
      localized: true,
    },
    {
      name: 'seo_title',
      type: 'text',
      label: 'SEO Title',
      required: false,
      localized: true,
    },
    {
      name: 'seo_description',
      type: 'text',
      label: 'SEO Description',
      required: false,
      localized: true,
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation }) => {
        console.log('🔄 AFTER CHANGE HOOK TRIGGERED')
        console.log('Operation:', operation)
        console.log('Document ID:', doc.id)
        /*console.log('Full document data:')
        console.log(JSON.stringify(doc, null, 2))
        console.log('--- END OF DOCUMENT DATA ---')*/

        // Call translation service
        await handleDocumentTranslation(doc, 'insights', operation)
        console.log('')
      },
    ],
  },
}
