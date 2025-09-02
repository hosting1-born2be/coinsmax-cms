import type { Config } from 'payload'
import { onInitExtension } from './onInitExtension'
import type { PluginTypes } from './types'
import {
  createTranslatorHandler,
  createMissingTranslatorHandler,
  generateTextHandler,
} from './handlers'
import { Translator } from './components/Translator'
import { Field, CustomComponent } from 'payload'

export const deeplTranslatorPlugin = (pluginOptions: PluginTypes) => {
  return (incomingConfig: Config): Config => {
    const { collections: allCollectionOptions, enabled = true } = pluginOptions
    let config = { ...incomingConfig }

    // If plugin is disabled, return config without modifications
    if (enabled === false) {
      return config
    }

    // Add translation endpoints to collections
    config.collections = (config.collections || []).map((existingCollection) => {
      const collectionOptions = allCollectionOptions[existingCollection.slug]

      if (!collectionOptions) return existingCollection

      return {
        ...existingCollection,
        hooks: {
          ...(existingCollection.hooks || {}),
          // Removed automatic translation on save - keeping only manual translator
        },
        fields: [
          ...(existingCollection.fields || []),
          // Add translator UI component
          {
            name: 'translator',
            type: 'ui',
            admin: {
              position: 'sidebar',
              components: {
                Field: Translator as unknown as CustomComponent<Record<string, any>>,
              },
            },
          } as Field,
        ],
      }
    })

    // Removed automatic media caption generation - keeping only manual translator

    // Admin components removed - keeping only manual translator

    // Add global endpoints
    config.endpoints = [
      ...(config.endpoints || []),
      {
        path: '/collections/:collectionSlug/translate',
        method: 'post',
        handler: createTranslatorHandler(pluginOptions),
      },
      {
        path: '/generate-text',
        method: 'post',
        handler: generateTextHandler(pluginOptions),
      },
    ]

    // Add onInit hook
    config.onInit = async (payload) => {
      if (incomingConfig.onInit) await incomingConfig.onInit(payload)
      onInitExtension(pluginOptions, payload)
    }

    return config
  }
}

// Keep backward compatibility
export const aiTranslatorPlugin = deeplTranslatorPlugin
