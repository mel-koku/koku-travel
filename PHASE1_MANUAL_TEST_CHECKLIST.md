# Phase 1 Manual Testing Checklist

## Prerequisites
- [ ] Application is running locally (`npm run dev`)
- [ ] Browser console is open to check for errors
- [ ] Network tab is open to monitor API calls

---

## 1.1 Budget Collection & Enforcement

### Step 1: Basic Info Form - Budget Inputs
- [ ] Navigate to `/trip-builder`
- [ ] Fill in trip duration (e.g., 5 days)
- [ ] Select a start date
- [ ] **Test Budget Level Dropdown:**
  - [ ] Select "Budget" - verify it saves
  - [ ] Select "Moderate" - verify it saves
  - [ ] Select "Luxury" - verify it saves
  - [ ] Clear selection - verify it's optional
- [ ] **Test Total Budget Input:**
  - [ ] Enter a valid number (e.g., 50000)
  - [ ] Enter 0 - verify it accepts
  - [ ] Try negative number - verify validation error
  - [ ] Leave empty - verify it's optional
- [ ] **Test Per-Day Budget Input:**
  - [ ] Enter a valid number (e.g., 5000)
  - [ ] Enter 0 - verify it accepts
  - [ ] Try negative number - verify validation error
  - [ ] Leave empty - verify it's optional
- [ ] Click "Next" and verify budget data persists through wizard steps

### Step 2: Budget Enforcement in Itinerary Generation
- [ ] Complete trip builder with:
  - Budget level: "Budget"
  - Per-day budget: 3000 JPY
- [ ] Generate itinerary
- [ ] **Check Budget Validation:**
  - [ ] Open browser console
  - [ ] Check API response for `validation.issues`
  - [ ] If activities exceed budget, verify warning appears
- [ ] **Test with Different Budget Levels:**
  - [ ] Create trip with "Luxury" budget level
  - [ ] Generate itinerary
  - [ ] Verify higher-cost activities are prioritized
- [ ] **Test with Explicit Budget Values:**
  - [ ] Create trip with per-day budget: 5000 JPY
  - [ ] Generate itinerary
  - [ ] Verify activities fit within daily budget (check location prices)

### Step 3: Budget Display in Review Step
- [ ] Complete trip builder with budget information
- [ ] Navigate to Step 5 (Review)
- [ ] Verify budget information is displayed correctly
- [ ] Edit Step 1 and change budget
- [ ] Verify updated budget appears in review

---

## 1.2 Meal Planning Integration

### Step 1: Meal Gap Detection
- [ ] Create a trip with:
  - Duration: 3 days
  - Interests: Include "food"
  - No specific meal preferences
- [ ] Generate itinerary
- [ ] **Check Each Day:**
  - [ ] Day 1: Look for meal activities (breakfast, lunch, dinner)
  - [ ] Day 2: Verify meals are inserted between activities
  - [ ] Day 3: Check meal timing windows:
    - Breakfast: 7:00-9:00
    - Lunch: 12:00-14:00
    - Dinner: 18:00-21:00

### Step 2: Meal Activity Properties
- [ ] Open an itinerary with meal activities
- [ ] **For each meal activity, verify:**
  - [ ] `mealType` field is set (breakfast/lunch/dinner)
  - [ ] Activity has "dining" tag
  - [ ] Activity is a restaurant location (category: "food")
  - [ ] Duration is ~60 minutes
  - [ ] Notes field contains meal type description

### Step 3: Meal Recommendations with Dietary Restrictions
- [ ] Create trip with:
  - Dietary restrictions: "Vegetarian" or "Gluten-free"
  - Generate itinerary
- [ ] Verify meal activities are included
- [ ] Check that meal recommendations consider dietary restrictions
  - Note: Currently filters by restrictions, but may need location metadata

### Step 4: Meal Timing Logic
- [ ] Create trip with activities that span meal times:
  - Morning activity ending at 10:00
  - Afternoon activity starting at 14:00
- [ ] Generate itinerary
- [ ] Verify lunch is inserted between 12:00-14:00
- [ ] Verify no duplicate meals in same time slot

---

## 1.3 Recommendation Explainability

### Step 1: Recommendation Reasoning Display
- [ ] Generate an itinerary
- [ ] Navigate to itinerary view (`/itinerary`)
- [ ] **For each activity, verify:**
  - [ ] "Why this recommendation?" button/link is visible
  - [ ] Click to expand reasoning section
  - [ ] Primary reason is displayed
  - [ ] Scoring breakdown section appears

### Step 2: Scoring Breakdown Details
- [ ] Expand recommendation reasoning for an activity
- [ ] **Verify scoring factors are displayed:**
  - [ ] Interest Match (with score and reasoning)
  - [ ] Rating Quality (with score and reasoning)
  - [ ] Logistical Fit (with score and reasoning)
  - [ ] Budget Fit (with score and reasoning)
  - [ ] Accessibility (with score and reasoning)
  - [ ] Diversity (with score and reasoning)
- [ ] Verify scores are numeric values
- [ ] Verify reasoning text is descriptive and helpful

### Step 3: Reasoning Persistence
- [ ] Generate itinerary
- [ ] View recommendation reasoning
- [ ] Refresh page
- [ ] Verify reasoning persists after page reload
- [ ] Edit itinerary (replace activity)
- [ ] Verify new activity has its own reasoning

### Step 4: Edge Cases
- [ ] Generate itinerary with minimal data (no interests, no budget)
- [ ] Verify reasoning still appears (may be generic)
- [ ] Generate itinerary with all preferences filled
- [ ] Verify detailed reasoning is shown

---

## 1.4 Enhanced Accessibility Scoring

### Step 1: Accessibility Requirements Input
- [ ] Navigate to trip builder Step 4 (Preferences)
- [ ] **Test Mobility Assistance Checkbox:**
  - [ ] Check "I require mobility assistance"
  - [ ] Verify it saves
  - [ ] Uncheck it
  - [ ] Verify it saves

### Step 2: Accessibility Filtering
- [ ] Create trip with:
  - Mobility assistance: **Enabled**
  - Generate itinerary
- [ ] **Verify accessibility filtering:**
  - [ ] Check browser console for scoring logs
  - [ ] Verify locations with `accessibility.wheelchairAccessible: false` are filtered out
  - [ ] Verify only accessible locations appear in itinerary

### Step 3: Accessibility Scoring Display
- [ ] Generate itinerary with mobility assistance enabled
- [ ] View recommendation reasoning for activities
- [ ] Expand reasoning section
- [ ] **Verify accessibility factor:**
  - [ ] Accessibility score is shown
  - [ ] Reasoning mentions "Wheelchair accessible" or similar
  - [ ] Score is > 0 for accessible locations

### Step 4: Location Accessibility Data
- [ ] Check mock locations data (`src/data/mockLocations.ts`)
- [ ] Verify some locations have `accessibility` field populated
- [ ] **Test with locations that have:**
  - [ ] `wheelchairAccessible: true` - should score high
  - [ ] `wheelchairAccessible: false` - should be filtered out
  - [ ] `stepFreeAccess: true` - should score well
  - [ ] No accessibility data - should get neutral score

### Step 5: Accessibility Without Requirements
- [ ] Create trip with:
  - Mobility assistance: **Disabled**
  - Generate itinerary
- [ ] Verify all locations appear (no filtering)
- [ ] Verify accessibility scoring is neutral (5 points)

---

## Integration Tests

### Test 1: Full Flow with All Features
- [ ] Create trip with:
  - Duration: 5 days
  - Budget: Moderate level, 4000 JPY per day
  - Interests: Culture, Food
  - Mobility assistance: Enabled
- [ ] Generate itinerary
- [ ] **Verify:**
  - [ ] Budget constraints are respected
  - [ ] Meals are inserted appropriately
  - [ ] Only accessible locations appear
  - [ ] Recommendation reasoning is available for all activities
  - [ ] Budget validation passes (or shows warnings)

### Test 2: Edge Cases
- [ ] **Very tight budget:**
  - [ ] Set per-day budget: 1000 JPY
  - [ ] Generate itinerary
  - [ ] Verify budget warnings appear
- [ ] **No budget specified:**
  - [ ] Leave all budget fields empty
  - [ ] Generate itinerary
  - [ ] Verify it still works (uses budget level defaults)
- [ ] **Very short trip:**
  - [ ] Duration: 1 day
  - [ ] Generate itinerary
  - [ ] Verify meals are still suggested appropriately

### Test 3: API Endpoints
- [ ] **Test `/api/itinerary/plan`:**
  - [ ] Send POST request with TripBuilderData including budget
  - [ ] Verify response includes `validation.issues` for budget
  - [ ] Verify response includes activities with `recommendationReason`
  - [ ] Verify response includes meal activities with `mealType`

---

## UI/UX Tests

### Visual Checks
- [ ] Budget inputs are clearly labeled
- [ ] Budget section doesn't break layout on mobile
- [ ] "Why this recommendation?" section is visually distinct
- [ ] Meal activities are clearly marked (icon/badge)
- [ ] Accessibility indicators are visible when relevant

### Responsive Design
- [ ] Test on mobile (< 768px)
- [ ] Test on tablet (768-1024px)
- [ ] Test on desktop (> 1024px)
- [ ] Verify all new UI elements are responsive

### Accessibility (WCAG)
- [ ] Budget inputs are keyboard navigable
- [ ] "Why this recommendation?" button is keyboard accessible
- [ ] Screen reader can announce budget values
- [ ] Color contrast meets WCAG AA standards

---

## Performance Tests

### Load Time
- [ ] Generate itinerary with budget constraints
- [ ] Measure time to generate (should be < 2 seconds)
- [ ] Generate itinerary with meal planning
- [ ] Measure time (should be < 3 seconds)

### Memory
- [ ] Generate multiple itineraries
- [ ] Check browser memory usage
- [ ] Verify no memory leaks

---

## Error Handling

### Invalid Inputs
- [ ] Enter negative budget - verify error message
- [ ] Enter very large budget (999999999) - verify it handles gracefully
- [ ] Enter non-numeric in budget field - verify validation

### Missing Data
- [ ] Generate itinerary without budget data - verify defaults work
- [ ] Generate itinerary without accessibility data - verify neutral scoring
- [ ] Generate itinerary with no restaurants - verify meal planning handles gracefully

---

## Browser Compatibility

- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge

---

## Notes Section

Use this space to document any issues found:

### Issues Found:
- [ ] Issue 1: [Description]
- [ ] Issue 2: [Description]

### Suggestions:
- [ ] Suggestion 1: [Description]
- [ ] Suggestion 2: [Description]

---

## Sign-off

- [ ] All Phase 1.1 tests passed
- [ ] All Phase 1.2 tests passed
- [ ] All Phase 1.3 tests passed
- [ ] All Phase 1.4 tests passed
- [ ] Integration tests passed
- [ ] Ready for Phase 2

**Tester:** _________________  
**Date:** _________________  
**Build Version:** _________________

