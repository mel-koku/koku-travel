/**
 * Maps Google Places API types to internal category system.
 *
 * This module provides functions to translate Google's primaryType and types
 * array into our internal location categories and subtypes.
 */

/**
 * Maps Google Places primaryType to our internal category system.
 * Returns a tuple of [category, subType] where subType is optional.
 *
 * @param primaryType - The primary type from Google Places API
 * @param types - Additional types array from Google Places API
 * @returns Category and optional subType for internal use
 */
export function mapGoogleTypeToCategory(
  primaryType?: string,
  types?: string[],
): { category: string; subType?: string } {
  if (!primaryType) {
    return { category: "point_of_interest" };
  }

  const type = primaryType.toLowerCase();

  // Accommodation
  if (
    type === "lodging" ||
    type === "hotel" ||
    type === "motel" ||
    type === "resort_hotel" ||
    type === "extended_stay_hotel" ||
    type === "bed_and_breakfast" ||
    type === "hostel" ||
    type === "guest_house" ||
    type === "ryokan" ||
    type === "capsule_hotel"
  ) {
    return { category: "hotel", subType: "hotel" };
  }

  // Transportation
  if (type === "airport" || type === "international_airport" || type === "domestic_airport") {
    return { category: "transport", subType: "airport" };
  }
  if (
    type === "train_station" ||
    type === "transit_station" ||
    type === "subway_station" ||
    type === "light_rail_station" ||
    type === "bus_station"
  ) {
    return { category: "transport", subType: "station" };
  }

  // Culture - Shrines & Temples
  if (type === "shinto_shrine" || type.includes("shrine")) {
    return { category: "culture", subType: "shrine" };
  }
  if (type === "buddhist_temple" || type === "hindu_temple" || type.includes("temple")) {
    return { category: "culture", subType: "temple" };
  }

  // Culture - Museums & Landmarks
  if (type === "museum" || type === "art_gallery") {
    return { category: "culture", subType: "museum" };
  }
  if (type === "castle" || type === "historical_landmark" || type === "monument" || type === "palace") {
    return { category: "culture", subType: "landmark" };
  }
  if (type === "performing_arts_theater" || type === "concert_hall" || type === "cultural_center") {
    return { category: "culture", subType: "performing_arts" };
  }
  if (type === "place_of_worship" || type === "church" || type === "mosque" || type === "synagogue") {
    return { category: "culture" };
  }

  // Food & Drink
  if (
    type === "restaurant" ||
    type === "japanese_restaurant" ||
    type === "sushi_restaurant" ||
    type === "ramen_restaurant" ||
    type === "italian_restaurant" ||
    type === "chinese_restaurant" ||
    type === "korean_restaurant" ||
    type === "thai_restaurant" ||
    type === "indian_restaurant" ||
    type === "american_restaurant" ||
    type === "french_restaurant" ||
    type === "seafood_restaurant" ||
    type === "steak_house" ||
    type === "barbecue_restaurant" ||
    type === "pizza_restaurant" ||
    type === "fast_food_restaurant" ||
    type === "meal_takeaway" ||
    type === "meal_delivery"
  ) {
    return { category: "restaurant", subType: "restaurant" };
  }
  if (type === "cafe" || type === "coffee_shop" || type === "bakery" || type === "ice_cream_shop") {
    return { category: "restaurant", subType: "cafe" };
  }
  if (type === "bar" || type === "night_club" || type === "wine_bar" || type === "cocktail_bar") {
    return { category: "bar", subType: "bar" };
  }
  if (type === "market" || type === "supermarket" || type === "grocery_store" || type === "food_store") {
    return { category: "market", subType: "market" };
  }

  // Nature
  if (
    type === "park" ||
    type === "city_park" ||
    type === "dog_park" ||
    type === "playground" ||
    type === "national_park" ||
    type === "state_park"
  ) {
    return { category: "nature", subType: "park" };
  }
  if (type === "botanical_garden") {
    return { category: "nature", subType: "garden" };
  }
  if (type === "beach") {
    return { category: "nature", subType: "beach" };
  }
  if (type === "hiking_area" || type === "campground") {
    return { category: "nature", subType: "mountain" };
  }
  if (type === "spa" || type === "hot_spring") {
    return { category: "nature", subType: "onsen" };
  }

  // Shopping
  if (type === "shopping_mall" || type === "department_store") {
    return { category: "shopping", subType: "mall" };
  }
  if (
    type === "store" ||
    type === "gift_shop" ||
    type === "clothing_store" ||
    type === "jewelry_store" ||
    type === "electronics_store" ||
    type === "book_store" ||
    type === "convenience_store"
  ) {
    return { category: "shopping", subType: "specialty" };
  }

  // Views & Attractions
  if (type === "tourist_attraction" || type === "scenic_spot" || type === "observation_deck") {
    return { category: "view", subType: "viewpoint" };
  }
  if (type === "tower") {
    return { category: "view", subType: "tower" };
  }

  // Entertainment
  if (
    type === "amusement_park" ||
    type === "theme_park" ||
    type === "aquarium" ||
    type === "zoo" ||
    type === "bowling_alley" ||
    type === "movie_theater" ||
    type === "casino"
  ) {
    return { category: "entertainment" };
  }

  // Check types array for fallback matching
  if (types && types.length > 0) {
    for (const t of types) {
      if (t === "lodging") return { category: "hotel", subType: "hotel" };
      if (t === "restaurant" || t === "food") return { category: "restaurant", subType: "restaurant" };
      if (t === "tourist_attraction") return { category: "view" };
      if (t === "park") return { category: "nature", subType: "park" };
      if (t === "store" || t === "shopping_mall") return { category: "shopping" };
    }
  }

  return { category: "point_of_interest" };
}
