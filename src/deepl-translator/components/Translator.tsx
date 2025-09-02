'use client'

import React, { useState } from 'react'
import { useDocumentInfo, useLocale, useConfig } from '@payloadcms/ui'

const Translator: React.FC = () => {
  const { id } = useDocumentInfo()
  const locale = useLocale()
  const config: any = useConfig()
  const [isTranslating, setIsTranslating] = useState(false)
  const [status, setStatus] = useState('')
  const [detectedLanguages, setDetectedLanguages] = useState<string[]>(['lt', 'sk'])

  // Get available languages from Payload configuration
  let availableLocales = config.localization?.locales || []

  // If config.localization.locales doesn't work, use hardcoded fallback from payload.config.ts
  const fallbackLocales = ['lt', 'sk'] // From payload.config.ts: locales: ['en', 'lt', 'sk']

  const targetLanguages =
    availableLocales.length > 0
      ? availableLocales.filter((loc: any) => loc !== 'en')
      : fallbackLocales

  // Log for debugging
  console.log('🔍 Localization config:', config.localization)
  console.log('🔍 Available locales:', availableLocales)
  console.log('🔍 Target languages:', targetLanguages)
  console.log('🔍 Current locale:', locale?.code)

  // Show button only for English locale
  if (locale?.code !== 'en') {
    return null
  }

  // Check if there are languages for translation
  if (targetLanguages.length === 0) {
    return null
  }

  const handleTranslate = async () => {
    if (!id) {
      setStatus('❌ No document ID found')
      return
    }

    setIsTranslating(true)
    setStatus('🔄 Translating...')

    try {
      const response = await fetch(`/api/collections/insights/translate?locale=${locale.code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          locale: 'en', // Source language is always English
          codes: targetLanguages, // Translate to all available non-English locales
          settings: {},
        }),
      })

      if (response.ok) {
        setStatus(
          `✅ Translation completed successfully! Document translated to: ${targetLanguages.join(', ').toUpperCase()}`,
        )
        // Refresh the page to show updated translations
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        const error = await response.json()
        setStatus(`❌ Translation failed: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsTranslating(false)
    }
  }

  return (
    <div className="field-type">
      <div className="field-input">
        <button
          type="button"
          onClick={handleTranslate}
          disabled={isTranslating}
          className="btn btn--style-primary"
          style={{
            backgroundColor: isTranslating ? '#6c757d' : '#007cba',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: isTranslating ? 'not-allowed' : 'pointer',
          }}
        >
          {isTranslating
            ? '🔄 Translating...'
            : `🔄 Translate to All Languages (${targetLanguages.join(', ').toUpperCase()})`}
        </button>
        {status && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: status.includes('✅') ? '#d4edda' : '#f8d7da',
              color: status.includes('✅') ? '#155724' : '#721c24',
              border: `1px solid ${status.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
            }}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  )
}

export { Translator }
