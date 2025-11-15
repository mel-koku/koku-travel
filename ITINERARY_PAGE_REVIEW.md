# Itinerary Page Review - Issues and Gaps

## Critical Issues

### 1. **Travel Mode Change Doesn't Trigger Route Recalculation**
**Location**: `src/components/features/itinerary/TimelineSection.tsx:122-129`

When a user changes travel mode via `TravelModeSelector`, only the `mode` property is updated. The route duration, distance, and path are not recalculated.

**Impact**: Users see incorrect travel times/distances after changing modes.

**Fix Required**: When `onModeChange` is called, trigger a route recalculation via `planItinerary` or call the routing API directly to update the travel segment.

```typescript
// Current implementation only updates mode:
onModeChange={(newMode) => {
  onUpdate(activity.id, {
    travelFromPrevious: {
      ...travelFromPrevious,
      mode: newMode,  // Only mode is updated
    },
  });
}}
```

**Recommendation**: Either:
- Trigger a full itinerary replan when mode changes
- Or fetch new route data immediately and update the travel segment with new duration/distance/path

---

### 2. **Debug Console.log Statements Left in Production Code**
**Location**: 
- `src/components/features/itinerary/PlaceActivityRow.tsx:187-196`
- `src/components/features/itinerary/TravelSegment.tsx:56`

Console.log statements are present in production code, which can:
- Expose internal state to users
- Impact performance
- Clutter browser console

**Fix Required**: Remove or wrap in `process.env.NODE_ENV === 'development'` checks.

---

### 3. **TravelSegment Directions Button Not Implemented**
**Location**: `src/components/features/itinerary/TravelSegment.tsx:51-60`

The "Directions" button has a TODO comment and only logs to console. Users expect to see turn-by-turn directions.

**Impact**: Poor UX - button appears clickable but doesn't provide value.

**Fix Required**: Implement a modal or expandable section to show turn-by-turn directions from `segment.instructions`.

---

## Major Issues

### 4. **Map Panel Sticky Positioning May Break with Different Header Heights**
**Location**: `src/components/features/itinerary/ItineraryShell.tsx:347`

Hardcoded sticky top value: `style={{ top: 'calc(80px + 10px)' }}`

**Impact**: Map may overlap header or have incorrect spacing if header height changes.

**Fix Required**: Use CSS custom properties or measure header height dynamically.

---

### 5. **No Error Recovery Mechanism for Planning Failures**
**Location**: `src/components/features/itinerary/ItineraryShell.tsx:175-191`

When `planItinerary` fails, an error message is shown but there's no retry button or recovery mechanism.

**Impact**: Users stuck with error state, must refresh page.

**Fix Required**: Add retry button and/or automatic retry with exponential backoff.

---

### 6. **Travel Mode Selector Doesn't Show Loading State During Route Fetch**
**Location**: `src/components/features/itinerary/TravelModeSelector.tsx:76-139`

When fetching route estimates, individual modes show loading spinners, but the current mode selector doesn't indicate when a route is being recalculated after mode change.

**Impact**: Users may not understand why travel times aren't updating immediately.

**Fix Required**: Show loading indicator in the main selector when route is being recalculated.

---

### 7. **Missing Validation for Travel Mode Changes**
**Location**: `src/components/features/itinerary/TimelineSection.tsx:122`

No validation that:
- Origin/destination coordinates exist before allowing mode change
- Mode change is valid for the route (e.g., can't use subway if no stations nearby)

**Impact**: Users can select invalid modes, leading to errors or incorrect routes.

**Fix Required**: Validate coordinates exist and optionally validate mode feasibility.

---

## Medium Issues

### 8. **Empty State Doesn't Guide Users to Add Activities**
**Location**: `src/app/itinerary/page.tsx:117-126`

Empty state only shows a link to trip builder, but doesn't explain:
- How to add activities to an existing itinerary
- That activities come from trip builder confirmation
- How to edit activities once added

**Fix Required**: Add more helpful guidance or a "How to use" section.

---

### 9. **City Transitions Are Display-Only**
**Location**: `src/components/features/itinerary/ItineraryTimeline.tsx:260-311`

City transitions show travel information but cannot be edited. Users may want to:
- Change travel mode
- Adjust departure/arrival times
- Add notes

**Fix Required**: Make city transitions editable or add edit functionality.

---

### 10. **No Way to Add Activities from Itinerary Page**
**Location**: Entire itinerary page

Users can only:
- Reorder activities
- Delete activities
- Edit activity notes

But cannot add new place activities directly.

**Impact**: Users must go back to trip builder to add activities, breaking workflow.

**Fix Required**: Add "Add activity" button that opens location search/selector.

---

### 11. **Planning Watchdog Timeout May Be Too Short**
**Location**: `src/components/features/itinerary/ItineraryShell.tsx:154, 246`

15-second timeout for planning may be insufficient for:
- Large itineraries
- Slow network connections
- Complex route calculations

**Impact**: Premature fallback to basic ordering even when planning would succeed.

**Fix Required**: Increase timeout or make it configurable based on itinerary size.

---

### 12. **No Visual Feedback When Activities Are Being Reordered**
**Location**: `src/components/features/itinerary/ItineraryTimeline.tsx`

When dragging activities, there's visual feedback, but no indication that:
- Travel times are being recalculated
- Schedule is being updated
- Changes are being saved

**Fix Required**: Show loading indicator or "Updating schedule..." message during drag operations.

---

### 13. **Map Doesn't Show City Transitions**
**Location**: `src/components/features/itinerary/ItineraryMapPanel.tsx`

Map only shows activities for the current day, but doesn't visualize:
- City transitions between days
- Inter-city travel routes
- Multi-day route overview

**Fix Required**: Add option to view multi-day route or city transitions on map.

---

## Minor Issues / UX Improvements

### 14. **No Keyboard Shortcuts**
**Location**: Entire itinerary page

No keyboard shortcuts for common actions:
- Delete activity (e.g., Delete key)
- Add note (e.g., N key)
- Navigate days (e.g., Arrow keys)

**Fix Required**: Add keyboard shortcuts with help modal.

---

### 15. **No Undo/Redo Functionality**
**Location**: Entire itinerary page

No way to undo accidental:
- Activity deletions
- Reordering
- Note edits

**Impact**: Users may lose work accidentally.

**Fix Required**: Implement undo/redo stack.

---

### 16. **Activity Selection State Not Persisted**
**Location**: `src/components/features/itinerary/ItineraryShell.tsx:98`

Selected activity resets when:
- Day changes
- Itinerary updates
- Component remounts

**Impact**: Users lose their place when navigating.

**Fix Required**: Persist selected activity ID in URL or localStorage.

---

### 17. **No Bulk Operations**
**Location**: Entire itinerary page

Cannot:
- Select multiple activities
- Delete multiple activities at once
- Move multiple activities to different day/time

**Fix Required**: Add multi-select and bulk operations.

---

### 18. **Map Marker Popups Don't Show Full Activity Info**
**Location**: `src/components/features/itinerary/ItineraryMapPanel.tsx:263`

Popup only shows activity title, missing:
- Schedule times
- Duration
- Notes preview

**Fix Required**: Show more activity details in popup.

---

### 19. **No Print/Export Functionality**
**Location**: Entire itinerary page

Users cannot:
- Print itinerary
- Export to PDF
- Share itinerary link

**Fix Required**: Add print/export/share features.

---

### 20. **Accessibility: Map Interactions Not Keyboard Accessible**
**Location**: `src/components/features/itinerary/ItineraryMapPanel.tsx`

Map markers and routes are not keyboard navigable.

**Fix Required**: Add keyboard navigation for map elements or provide alternative text-based view.

---

## Code Quality Issues

### 21. **Unused Import in PlaceActivityRow**
**Location**: `src/components/features/itinerary/PlaceActivityRow.tsx:14`

`TravelModeSelector` is imported but never used in this component.

**Fix Required**: Remove unused import.

---

### 22. **Complex State Management in ItineraryShell**
**Location**: `src/components/features/itinerary/ItineraryShell.tsx`

Multiple refs and flags (`skipSyncRef`, `skipNextPlanRef`, `planTimeoutRef`, etc.) make state management complex and hard to reason about.

**Fix Required**: Consider using a state machine (e.g., XState) or reducer pattern to simplify.

---

### 23. **Magic Numbers**
**Location**: Multiple files

Hardcoded values like:
- `450` ms debounce delay
- `15000` ms watchdog timeout
- `0.2` padding for map bounds

**Fix Required**: Extract to named constants.

---

### 24. **No Type Safety for Activity Updates**
**Location**: `src/components/features/itinerary/ItineraryTimeline.tsx:96-123`

`onUpdate` accepts `Partial<ItineraryActivity>`, which can lead to invalid states (e.g., updating a note activity with place-specific fields).

**Fix Required**: Use discriminated union types or stricter validation.

---

## Performance Considerations

### 25. **Planning Runs on Every Activity Change**
**Location**: `src/components/features/itinerary/ItineraryShell.tsx:131-195`

Even with debouncing, planning runs frequently and may be expensive for large itineraries.

**Fix Required**: 
- Only plan affected days/activities
- Cache route results
- Use optimistic updates

---

### 26. **Map Re-renders on Every Activity Change**
**Location**: `src/components/features/itinerary/ItineraryMapPanel.tsx:186-313`

Map effect runs whenever `points` or `travelSegments` change, even for unrelated updates.

**Fix Required**: Memoize map updates or use more granular dependencies.

---

## Missing Features

### 27. **No Day Reordering**
Users cannot reorder days in the itinerary.

### 28. **No Day Duplication**
Users cannot duplicate a day to create similar schedules.

### 29. **No Activity Templates**
Users cannot save activities as templates for reuse.

### 30. **No Collaboration Features**
No way to share itinerary with others or collaborate in real-time.

---

## Recommendations Summary

### High Priority
1. Fix travel mode change to trigger route recalculation
2. Remove console.log statements
3. Implement directions modal/display
4. Add error recovery mechanism
5. Fix map sticky positioning

### Medium Priority
6. Add ability to add activities from itinerary page
7. Make city transitions editable
8. Improve empty state guidance
9. Add loading states for mode changes
10. Increase planning timeout or make configurable

### Low Priority
11. Add keyboard shortcuts
12. Add undo/redo
13. Add print/export
14. Improve accessibility
15. Add bulk operations

### Code Quality
16. Simplify state management
17. Extract magic numbers
18. Improve type safety
19. Optimize performance
20. Remove unused imports

