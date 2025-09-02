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

    {
      name: 'translateLT', // службове поле, не зберігається
      type: 'ui',
      admin: {
        components: {
          Field: '@/admin/components/TranslateLTButton', // шлях до вашого React-компонента кнопки
        },
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    /*afterOperation: [
      async ({ req, operation, result }) => {
        // 1) уникаємо рекурсії
        if (req?.context?.skipTranslate) return

        // 2) тільки для створення/оновлення
        const op = String(operation)
        if (op !== 'create' && op !== 'update' && op !== 'updateByID') return

        // 3) тільки коли редагуємо дефолтну локаль
        const defaultLocale = 'en' // замініть на свою
        const currentLocale = (req as any).locale || defaultLocale
        if (currentLocale !== defaultLocale) return

        await handleDocumentTranslation(
          result,
          'insights',
          op === 'create' ? 'create' : 'update',
          req as Request,
        )
      },
    ],*/
  },

  endpoints: [
    {
      path: '/:id/translate-lt',
      method: 'post',
      // доступ тільки адмінам
      handler: async (req) => {
        try {
          if (!req.user || req.user.role !== 'admin') {
            return new Response(JSON.stringify({ message: 'Forbidden' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // В Payload CMS v3 ID передається через URL path
          // Отримуємо ID з URL: /:id/translate-lt
          const urlParts = (req as any).url?.split('/') || []
          const id = urlParts[urlParts.length - 2] // перед translate-lt

          if (!id) {
            return new Response(JSON.stringify({ message: 'ID is required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // 1) читаємо документ у дефолтній локалі
          const defaultLocale = 'en'
          const result = await (req as any).payload.findByID({
            collection: 'insights',
            id,
            locale: defaultLocale,
            depth: 0,
          })
          const doc = result.doc

          // 2) запускаємо ваш сервіс (він всередині вже зробить update на locale=lt)
          //    ВАЖЛИВО: передаємо req, щоб не було конфліктів локів
          await handleDocumentTranslation(doc, 'insights', 'update', req as any)

          return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e) {
          console.error('translate-lt error', e)
          return new Response(JSON.stringify({ ok: false, error: String(e) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  ],
}
