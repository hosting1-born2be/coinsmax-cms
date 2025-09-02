export interface PluginTypes {
  /**
   * Enable or disable plugin
   * @default true
   */
  enabled?: boolean
  /**
   * Collection options
   */
  collections: {
    [key: string]: CollectionOptions
  }
  /**
   * DeepL API key (optional, can use env variable DEEPL_API_KEY)
   */
  deeplApiKey?: string
  /**
   * DeepL API URL (optional, defaults to free tier)
   */
  deeplApiUrl?: string
  /**
   * DeepL plan type: always 'pro'
   * @default 'pro'
   */
  deeplPlan?: 'pro'
}

export interface CollectionOptions {
  /**
   * Fields to translate
   */
  fields: string[]
  /**
   * Custom settings for DeepL
   */
  settings?: {
    /**
     * Formality level: 'more' | 'less' | 'prefer_more' | 'prefer_less'
     */
    formality?: 'more' | 'less' | 'prefer_more' | 'prefer_less'
    /**
     * Preserve formatting
     */
    preserveFormatting?: boolean
    /**
     * Tag handling: 'xml' | 'html'
     */
    tagHandling?: 'xml' | 'html'
    /**
     * Split sentences: '0' | '1' | 'nonewlines'
     */
    splitSentences?: '0' | '1' | 'nonewlines'
  }
  /**
   * Access control for translation endpoints
   */
  access?: {
    translate?: boolean
    generateAlt?: boolean
  }
}

export interface PromptParams {
  messages: any[]
  namespace?: string
  sourceLanguage?: string
  language?: string
  settings?: any
}

export interface TranslationRequest {
  id: string
  locale: string
  codes?: string[]
  settings?: any
  onlyMissing?: boolean
}

export interface TranslationResponse {
  success: boolean
  message: string
  data?: any
}

export interface DeepLTranslationRequest {
  text: string[]
  target_lang: string
  source_lang?: string
  formality?: 'more' | 'less' | 'prefer_more' | 'prefer_less'
  preserve_formatting?: boolean
  tag_handling?: 'xml' | 'html'
  split_sentences?: '0' | '1' | 'nonewlines'
}

export interface DeepLTranslationResponse {
  translations: Array<{
    detected_source_language: string
    text: string
  }>
}
