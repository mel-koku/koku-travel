import { type SchemaTypeDefinition } from 'sanity'
import { author } from './author'
import { guide } from './guide'
import { blogPost } from './blogPost'
import { destination } from './destination'
import { itinerary, itineraryActivity, itineraryDay } from './itinerary'
import { blockContent } from './blockContent'
import { place } from './place'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    author,
    guide,
    blogPost,
    destination,
    itinerary,
    itineraryActivity,
    itineraryDay,
    blockContent,
    place,
  ],
}
