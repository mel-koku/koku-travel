# Translation Files Structure

This directory contains translation files for the Koku Travel application, supporting 4 languages:
- **en** - English (complete)
- **jp** - Japanese (TODO: professional translation required)
- **ko** - Korean (TODO: professional translation required)
- **zh** - Chinese (TODO: professional translation required)

## Directory Structure

```
messages/
├── en/
│   ├── common.json      # Common UI elements, buttons, labels, status messages
│   ├── navigation.json  # Menu items, breadcrumbs, footer
│   ├── explore.json     # Explore page content
│   ├── guides.json      # Travel guides content
│   ├── auth.json        # Authentication flows
│   └── errors.json      # Error messages
├── jp/
│   └── [same structure - TODO translations]
├── ko/
│   └── [same structure - TODO translations]
└── zh/
    └── [same structure - TODO translations]
```

## File Descriptions

### common.json
Common UI elements used throughout the application:
- **actions**: Button labels (Save, Cancel, Delete, etc.)
- **status**: Status messages (Loading, Success, Error, etc.)
- **labels**: Form labels and field names
- **placeholders**: Input placeholders
- **time**: Time-related strings
- **units**: Measurement units

### navigation.json
Navigation and menu-related translations:
- **menu**: Main navigation menu items
- **breadcrumbs**: Breadcrumb navigation
- **footer**: Footer content and links
- **language**: Language selection

### explore.json
Explore page content:
- **search**: Search functionality
- **filters**: Filter options and labels
- **categories**: Place categories
- **places**: Place-related content
- **map**: Map view controls
- **results**: Search results display

### guides.json
Travel guides content:
- **categories**: Guide categories
- **filters**: Guide filtering options
- **guide**: Individual guide content structure
- **list**: Guide listing
- **create**: Guide creation/editing

### auth.json
Authentication-related translations:
- **signIn**: Sign in form and messages
- **signUp**: Registration form and messages
- **signOut**: Sign out confirmation
- **forgotPassword**: Password reset flow
- **resetPassword**: Password reset form
- **verifyEmail**: Email verification
- **profile**: User profile management
- **validation**: Form validation messages

### errors.json
Error messages and error handling:
- **generic**: Generic error messages
- **network**: Network-related errors
- **notFound**: 404 errors
- **unauthorized**: 401 errors
- **forbidden**: 403 errors
- **serverError**: 500 errors
- **validation**: Form validation errors
- **auth**: Authentication errors
- **api**: API-related errors
- **form**: Form submission errors
- **location**: Location-related errors
- **trip**: Trip-related errors
- **guide**: Guide-related errors

## Translation Guidelines

### For Translators

1. **Maintain Structure**: Keep the exact same JSON structure as the English files
2. **Preserve Keys**: Never change or translate the JSON keys, only the values
3. **Variables**: Preserve variable placeholders like `{field}`, `{count}`, `{email}`, etc.
4. **Context**: Consider the context where each string appears
5. **Consistency**: Use consistent terminology throughout all files
6. **Cultural Adaptation**: Adapt content culturally where appropriate (dates, formats, etc.)

### Variable Placeholders

Some strings contain variables that should be preserved:
- `{field}` - Field name
- `{count}` - Number count
- `{email}` - Email address
- `{query}` - Search query
- `{year}` - Year
- `{min}` - Minimum value
- `{max}` - Maximum value
- `{maxSize}` - Maximum file size
- `{types}` - File types

Example:
```json
{
  "showing": "Showing {count} results"
}
```

Should become (Japanese example):
```json
{
  "showing": "{count}件の結果を表示"
}
```

### TODO Files

Files marked with `TODO: Professional [Language] translation required` need to be translated by native speakers familiar with:
- Travel and tourism terminology
- UI/UX best practices
- Cultural nuances
- Technical terminology

## Usage

These translation files are designed to work with next-intl or similar i18n libraries. The structure allows for:
- Namespaced translations (e.g., `common.actions.save`)
- Easy maintenance and updates
- Scalable organization
- Type-safe access (when used with TypeScript)

## Next Steps

1. ✅ English translations complete
2. ⏳ Japanese translations needed
3. ⏳ Korean translations needed
4. ⏳ Chinese translations needed

## Notes

- All English files are production-ready
- Non-English files contain TODO placeholders and need professional translation
- Maintain consistent terminology across all languages
- Test translations in context to ensure proper display and meaning

