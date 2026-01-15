'use client'

/**
 * This configuration is used to for the Sanity Studio that's mounted on the `/app/studio/[[...tool]]/page.tsx` route
 */

import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

// Go to https://www.sanity.io/docs/api-versioning to learn how API versioning works
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- apiVersion reserved for visionTool when re-enabled
import {apiVersion, dataset, projectId} from './src/sanity/env'
import {schema} from './src/sanity/schemaTypes'
import {structure} from './src/sanity/structure'

// Conditionally import vision tool to avoid build errors
// Vision is for querying with GROQ from inside the Studio
// https://www.sanity.io/docs/the-vision-plugin
// Note: Temporarily disabled due to version compatibility issues
// Can be re-enabled when @sanity/vision is updated to match sanity version
const plugins = [
  structureTool({structure}),
  // visionTool temporarily disabled - uncomment when version compatibility is resolved
  // visionTool({defaultApiVersion: apiVersion}),
];

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  // Add and edit the content schema in the './sanity/schemaTypes' folder
  schema,
  plugins,
})
