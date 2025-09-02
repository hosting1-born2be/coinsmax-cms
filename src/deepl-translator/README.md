# DeepL Translator Plugin for Payload CMS

A powerful translation plugin for Payload CMS that uses DeepL's high-quality translation API to manually translate content between multiple languages.

## Features

- 🌐 **High-Quality Translations**: Powered by DeepL's Pro translation API
- 🔄 **Manual Translation**: Translate content on-demand via admin interface
- 📝 **Field-Level Control**: Choose which fields to translate for each collection
- 🎯 **Smart Merging**: Intelligently merges translated content with existing translations
- 🛡️ **Access Control**: Built-in role-based access control for translation endpoints
- 📱 **Admin UI Integration**: Seamless integration with Payload CMS admin interface
- 🚀 **Batch Translation**: Translate multiple fields at once
- ⚡ **Performance Optimized**: Efficient batch processing and caching
- 🔍 **Dynamic Language Detection**: Automatically detects available languages from Payload config
- 📊 **RichText Support**: Full support for Lexical RichText editor content
- 🔄 **Force Re-translation**: Always re-translates fields to ensure content freshness

## Installation

1. **Install the plugin**:
   ```bash
   npm install @your-org/deepl-translator
   # or
   yarn add @your-org/deepl-translator
   ```

2. **Set up environment variables**:
   ```bash
   # .env
   DEEPL_API_KEY=your-deepl-api-key-here
   ```

3. **Configure the plugin in your Payload config**:
   ```typescript
   import { deeplTranslatorPlugin } from './deepl-translator'

   export default buildConfig({
     // ... other config
     localization: {
       locales: ['en', 'lt', 'sk'], // Your supported languages
       defaultLocale: 'en',
     },
     plugins: [
       deeplTranslatorPlugin({
         enabled: true,
         collections: {
           insights: {
             fields: ['title', 'content', 'excerpt', 'seo_title', 'seo_description'],
           },
         },
       }),
     ],
   })
   ```

## Configuration Options

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable the plugin |
| `collections` | `object` | `{}` | Collection-specific configuration |
| `deeplApiKey` | `string` | `process.env.DEEPL_API_KEY` | DeepL API key |
| `deeplApiUrl` | `string` | `https://api.deepl.com/v2/translate` | DeepL Pro API URL |

### Collection Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fields` | `string[]` | `[]` | Fields to translate |
| `settings` | `object` | `{}` | DeepL-specific settings |
| `access` | `object` | `{}` | Access control settings |

### DeepL Settings

| Setting | Type | Description |
|---------|------|-------------|
| `formality` | `'more' \| 'less' \| 'prefer_more' \| 'prefer_less'` | Formality level |
| `preserveFormatting` | `boolean` | Preserve text formatting |
| `tagHandling` | `'xml' \| 'html'` | HTML/XML tag handling |
| `splitSentences` | `'0' \| '1' \| 'nonewlines'` | Sentence splitting behavior |

## Usage

### Manual Translation

The plugin provides a manual translation interface in the admin panel:

1. Navigate to a document in the admin panel
2. Look for the "Translator" sidebar component (only visible for English locale)
3. Click "Translate to All Languages" to translate to all non-English locales
4. The button automatically detects available languages from your Payload config

### Translation Behavior

- **Source Language**: Always English (`en`)
- **Target Languages**: Automatically detected from `config.localization.locales`
- **Dynamic Detection**: Plugin automatically finds all non-English locales from your Payload configuration
- **Field Processing**: All specified fields are re-translated (even if translations exist)
- **RichText Support**: Full support for Lexical RichText editor with nested elements (paragraphs, lists, links, headings)
- **Content Preservation**: Original structure and formatting are maintained
- **Smart Visibility**: Translation button only appears for English locale documents

### API Endpoints

The plugin provides several API endpoints:

- `POST /api/collections/:collectionSlug/translate` - Translate a document
- `POST /api/generate-text` - Generate translated text

### Programmatic Usage

```typescript
import { DeepLService } from './deepl-translator'

const deeplService = new DeepLService({
  collections: {},
  deeplApiKey: process.env.DEEPL_API_KEY,
})

// Translate single text
const translated = await deeplService.translateText(
  'Hello world',
  'LT',
  'EN',
  { formality: 'prefer_more' }
)

// Batch translate multiple texts
const translated = await deeplService.translateBatch(
  ['Hello', 'World'],
  'LT',
  'EN'
)
```

## Supported Languages

DeepL Pro supports 29+ languages including:

- **European Languages**: English, German, French, Italian, Spanish, Portuguese, Russian, Dutch, Polish, Bulgarian, Czech, Danish, Greek, Estonian, Finnish, Hungarian, Indonesian, Korean, Lithuanian, Latvian, Norwegian, Romanian, Slovak, Slovenian, Swedish, Turkish, Ukrainian
- **Asian Languages**: Japanese, Chinese, Thai, Vietnamese
- **Other Languages**: Arabic, Hindi

## Access Control

The plugin includes built-in access control:

- **Admin Only**: Translation endpoints require admin role by default
- **Customizable**: Configure access per collection
- **Role-Based**: Integrates with Payload's role system

## Error Handling

The plugin includes comprehensive error handling:

- **API Errors**: Graceful handling of DeepL API errors
- **Rate Limiting**: Automatic retry with exponential backoff
- **Fallback**: Original content preserved if translation fails
- **Logging**: Detailed logging for debugging
- **Recursion Prevention**: Smart context flags prevent infinite loops

## Performance

- **Batch Processing**: Efficient translation of multiple texts
- **Smart Caching**: Avoids re-translating unchanged content
- **Async Operations**: Non-blocking translation operations
- **Memory Efficient**: Minimal memory footprint
- **RichText Optimization**: Efficient processing of complex nested structures

## Troubleshooting

### Common Issues

1. **API Key Invalid**: Ensure `DEEPL_API_KEY` is set correctly
2. **Rate Limiting**: Check DeepL usage limits
3. **Language Codes**: Verify language codes are supported
4. **Field Types**: Ensure fields are translatable types
5. **Recursion Errors**: Check for circular references in RichText content

### Debug Mode

Enable debug logging by checking browser console for detailed information about:
- Configuration loading
- Language detection
- Translation process
- RichText processing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:

- Create an issue on GitHub
- Check the documentation
- Review the examples

## Changelog

### v2.1.0
- **Dynamic Language Detection**: Automatically detects available languages from Payload config
- **Simplified UI**: Replaced complex modal with simple button interface
- **Smart Visibility**: Button only shows for English locale documents
- **Enhanced RichText Support**: Improved handling of nested RichText structures
- **Force Re-translation**: Always re-translates fields to ensure content freshness
- **Removed AfterDashboard**: Simplified plugin architecture

### v2.0.0
- **Migrated from Google Gemini to DeepL API**: Improved translation quality and reliability
- **Added batch translation support**: Efficient processing of multiple fields
- **Enhanced error handling**: Better error recovery and logging
- **Performance optimization**: Improved memory usage and processing speed
- **RichText support**: Full support for Lexical RichText editor content

### v1.0.0
- Initial release with DeepL API support
- Basic translation functionality
- Admin UI integration
