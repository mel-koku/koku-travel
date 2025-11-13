# Sanity Authors & Guides Setup

This guide explains how to set up and use the Authors and Guides content management in Sanity Studio.

## Overview

The Sanity Studio now includes:
- **Authors**: Expert profiles who create guides
- **Guides**: Travel guides authored by experts

Authors can manage their own content directly in Sanity Studio without needing to modify code.

## Setting Up Authors

### 1. Create an Author

1. Open Sanity Studio at `/studio`
2. Click on **Authors** in the sidebar
3. Click **Create new** or the **+** button
4. Fill in the required fields:
   - **Full Name**: The author's full name (e.g., "Mika Tanaka")
   - **Slug**: Auto-generated from name, but can be edited
   - **Biography**: A detailed bio (minimum 50 characters)
   - **Areas of Expertise**: Add tags for expertise areas (e.g., "Temple Architecture", "Food Culture")
   - **Languages Spoken**: Select from the list or add custom languages
   - **Avatar Image**: Upload a profile picture
   - **Cover Image**: (Optional) Cover image for profile pages
   - **Primary Location**: City/region (e.g., "Kyoto, Japan")
   - **Years of Experience**: Number of years

5. Click **Publish** to save

### 2. Create a Guide

1. Click on **Guides** in the sidebar
2. Click **Create new** or the **+** button
3. Fill in the required fields:
   - **Title**: The guide title (e.g., "A Day in Kyoto's Temples")
   - **Slug**: Auto-generated from title
   - **Author**: **Select an existing author** from the dropdown (this is required!)
   - **Headline**: Short description for cards (max 120 characters)
   - **Summary**: Brief summary (max 240 characters)
   - **Categories**: Select 1-4 categories (Culture, Food, Nature, Nightlife, Shopping, View)
   - **Location**: Primary city/location
   - **Cover Image**: Main image for the guide
   - **Featured Guide**: Check if this should be featured prominently
   - **Published At**: (Optional) Publication date

4. Click **Publish** to save

## Important Notes

### Author-Guide Relationship

- **Every guide must have an author**: Guides reference authors, so you must create authors first
- **Author information is centralized**: Author details (name, bio, languages, etc.) are stored in the Author document and referenced by guides
- **Reusability**: One author can create multiple guides

### Migration from Old Schema

If you have existing guides with author information embedded:
1. Create Author documents for each unique author
2. Update existing Guide documents to reference the new Author documents
3. The old `name`, `languages`, and `experience` fields on guides have been replaced with the `author` reference

## Workflow for Authors

Authors can follow this workflow to add content:

1. **First time setup**:
   - Create their Author profile (or ask an admin to create it)
   - Fill in their bio, expertise, languages, and images

2. **Creating guides**:
   - Go to Guides → Create new
   - Select themselves as the Author
   - Fill in guide details
   - Upload cover image
   - Publish

3. **Updating content**:
   - Edit their Author profile to update bio, expertise, etc.
   - Edit their Guides to update content
   - Changes are live after publishing

## Environment Variables

Make sure these are set in your `.env.local`:

```bash
SANITY_PROJECT_ID=your_project_id
SANITY_DATASET=production
SANITY_API_READ_TOKEN=your_read_token
SANITY_API_WRITE_TOKEN=your_write_token
SANITY_PREVIEW_SECRET=your_preview_secret
SANITY_REVALIDATE_SECRET=your_revalidate_secret
```

## Running Sanity Studio

```bash
npm run sanity:dev
```

Then visit `http://localhost:3333/studio` (or the configured port).

## API Usage

### Fetching Authors

```typescript
import { fetchAuthors, fetchAuthorBySlug } from "@/lib/sanity/authors";

// Get all authors
const authors = await fetchAuthors();

// Get author by slug with their guides
const author = await fetchAuthorBySlug("mika-tanaka", { includeGuides: true });
```

### Fetching Guides

```typescript
import { fetchGuides, fetchGuideBySlug } from "@/lib/sanity/guides";

// Get all guides (includes author info)
const guides = await fetchGuides();

// Get guide by slug (includes author info)
const guide = await fetchGuideBySlug("kyoto-culture");
```

## Troubleshooting

### "Author is required" error when creating a guide
- Make sure you've created at least one Author document first
- The Author dropdown should show available authors

### Guides not showing author information
- Verify the guide has an author reference set
- Check that the author document exists and is published
- Ensure queries include the author reference expansion

### Images not uploading
- Check that your Sanity project has image uploads enabled
- Verify your API tokens have write permissions
- Check browser console for CORS or permission errors

