import { DeepLService } from './deeplService'

interface GenerateTextRequest {
  text: string
  targetLanguage: string
  sourceLanguage?: string
  settings?: any
}

interface GenerateTextResponse {
  success: boolean
  translatedText?: string
  error?: string
}

export async function generateText(request: GenerateTextRequest): Promise<GenerateTextResponse> {
  try {
    // Initialize DeepL service
    const deeplService = new DeepLService({
      collections: {},
      deeplApiKey: process.env.DEEPL_API_KEY,
    })

    console.log('🌐 Generating text with DeepL:', {
      targetLanguage: request.targetLanguage,
      sourceLanguage: request.sourceLanguage,
      textLength: request.text.length,
    })

    // Translate text using DeepL
    const translatedText = await deeplService.translateText(
      request.text,
      request.targetLanguage,
      request.sourceLanguage,
      request.settings,
    )

    return {
      success: true,
      translatedText,
    }
  } catch (error) {
    console.error('❌ Text generation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
