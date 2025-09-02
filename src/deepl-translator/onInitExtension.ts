import type { Payload } from 'payload'
import type { PluginTypes } from './types'

export const onInitExtension = (pluginOptions: PluginTypes, payload: Payload): void => {
  try {
    // Log plugin initialization
    console.log('DeepL Translator Plugin initialized successfully')

    // You can add additional initialization logic here
    // For example, setting up custom middleware, routes, etc.

    if (pluginOptions.deeplApiKey) {
      console.log('DeepL API key provided via plugin options (Pro plan)')
    } else if (process.env.DEEPL_API_KEY) {
      console.log('DeepL API key found in environment variables (Pro plan)')
    } else {
      console.warn('No DeepL API key found. Please set DEEPL_API_KEY environment variable.')
    }
  } catch (err: unknown) {
    console.error('DeepL Translator Plugin initialization error:', err)
  }
}
