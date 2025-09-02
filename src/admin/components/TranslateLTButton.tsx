'use client'

import React, { useState } from 'react'
import { useDocumentInfo, useLocale } from '@payloadcms/ui'

const TranslateLTButton: React.FC = () => {
  const { id } = useDocumentInfo()
  const locale = useLocale()
  const [isTranslating, setIsTranslating] = useState(false)
  const [status, setStatus] = useState('')

  // Ховаємо кнопку для литовської локалі
  if (locale?.code === 'lt') {
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
      const response = await fetch(`/api/insights/${id}/translate-lt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setStatus('✅ Translation completed successfully!')
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
      <label className="field-label">Translate to Lithuanian</label>
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
          {isTranslating ? '🔄 Translating...' : '🔄 Translate to LT'}
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

export default TranslateLTButton
