# Kyoto Location Recommendation Logic Assessment

## Executive Summary

This assessment examines the recommendation logic for locations in the itinerary system, with a focus on understanding why a location in Kyoto might be showing an issue. The system uses a comprehensive multi-factor scoring algorithm to select locations, but several potential issues could cause problems with recommendations.

## Recommendation Logic Overview

### Core Scoring System

The recommendation engine uses a **multi-factor scoring system** (`locationScoring.ts`) that evaluates locations based on:

1. **Interest Match** (0-30 points)
   - Matches location category to user interests
   - Perfect match: 30 points
   - Partial match: 15-30 points (proportional)
   - No match: 5 points

2. **Rating Quality** (0-25 points)
   - Rating component: 0-15 points (based on 0-5 scale)
   - Review count component: 0-10 points
   - Credibility increases with more reviews

3. **Logistical Fit** (0-20 points)
   - Distance scoring: 0-8 points (prefers <1km, penalizes >10km)
   - Duration fit: 0-7 points (optimal if 30-70% of available time)
   - Travel style adjustment: 0-5 points

4. **Budget Fit** (0-10 points)
   - Checks against budget level (budget/moderate/luxury)
   - Validates against explicit per-day or total budget
   - Penalizes locations exceeding budget

5. **Accessibility Fit** (0-10 points)
   - Checks wheelchair accessibility
   - Validates elevator requirements
   - Can filter out non-accessible locations (score < 3)

6. **Diversity Bonus** (-5 to +5 points)
   - Penalizes category repetition
   - Bonus for new categories
   - Prevents monotony

7. **Weather Fit** (score adjustment)
   - Adjusts based on weather forecast
   - Considers indoor/outdoor preferences

8. **Time Optimization** (score adjustment)
   - Checks optimal time-of-day for category
   - Validates opening hours fit
   - Penalizes if location closed during scheduled time

9. **Group Fit** (score adjustment)
   - Considers group type (solo/couple/family/friends/business)
   - Validates kid-friendly requirements

### Location Selection Process

The `pickLocationForTimeSlot` function in `itineraryGenerator.ts`:

1. Filters unused locations
2. Scores all candidates using the criteria above
3. Applies diversity filter
4. Sorts by score (descending)
5. Picks from top 5 candidates with randomness

## Potential Issues with Kyoto Location

### 1. Opening Hours Mismatch ⚠️ **MOST LIKELY ISSUE**

**Problem**: The location may be scheduled during a time when it's closed.

**Detection Logic** (`timeOptimization.ts`):
- Checks if location's operating hours cover the scheduled time slot
- Time slots: morning (9-12), afternoon (12-17), evening (17-21)
- Returns `fits: false` if no matching period found

**Impact**:
- Score penalty: -5 points if opening hours don't fit
- Issue notification shown in UI
- Location may still be selected if other factors score high

**Example Scenario**:
- Location scheduled for "morning" (9am-12pm)
- Location opens at 10am
- System detects mismatch and flags issue

### 2. Availability Status Issues

**Problem**: Location may be closed, busy, or require reservations.

**Detection** (`PlaceActivityRow.tsx`):
- Checks availability via `/api/itinerary/availability`
- Statuses: `open`, `closed`, `busy`, `requires_reservation`, `unknown`
- Shows warnings for non-open statuses

**Impact**:
- Visual warnings in activity row
- May not prevent selection but alerts user

### 3. Logistical Fit Problems

**Problem**: Location may be too far from previous activity or doesn't fit time budget.

**Scoring Issues**:
- Distance >10km: -2 points penalty
- Duration exceeds available time: -3 points penalty
- May still be selected if other factors compensate

### 4. Budget Constraint Violation

**Problem**: Location price exceeds user's budget.

**Detection**:
- Checks against `budgetPerDay` or `budgetTotal`
- Allows up to 30% of daily budget per activity
- Penalizes if exceeds budget

**Impact**:
- Score reduction (2-3 points)
- May still be selected if other factors strong

### 5. Accessibility Requirements Not Met

**Problem**: Location doesn't meet accessibility requirements.

**Detection**:
- If accessibility required but location doesn't have it
- Score set to 0 if score < 3
- Should filter out, but may slip through

### 6. Time-of-Day Suboptimal

**Problem**: Location scheduled at non-optimal time for its category.

**Examples**:
- Temple/shrine scheduled for afternoon (optimal: morning/evening)
- Restaurant scheduled for morning (optimal: afternoon/evening)
- Bar scheduled for morning (optimal: evening)

**Impact**:
- Score penalty: -3 points
- Still functional but not ideal experience

## Issue Detection Flow

### In UI Components

1. **PlaceActivityRow** (`PlaceActivityRow.tsx`):
   - Checks `activity.availabilityStatus` and `activity.availabilityMessage`
   - Fetches availability via API if not present
   - Displays warnings for closed/busy/reservation-required

2. **ItineraryMapPanel** (`ItineraryMapPanel.tsx`):
   - Maps activities to coordinates
   - Shows route visualization
   - **Note**: No explicit issue counting found in this component

3. **Scoring During Generation** (`itineraryGenerator.ts`):
   - Checks opening hours during selection
   - Applies penalties but doesn't prevent selection
   - May select location with issues if score still high enough

## Root Cause Analysis

### Critical Bug Found: Opening Hours Check Logic Error 🐛

**Location**: `src/lib/scoring/timeOptimization.ts`, line 127

**Current (Buggy) Logic**:
```typescript
if (slotRange.start >= openHour && slotRange.end <= closeHour) {
  return { fits: true, ... };
}
```

**Problem**: This requires the **entire time slot** to be within operating hours, which is too strict.

**Example**:
- Time slot: morning (9am-12pm)
- Location opens: 10am, closes: 6pm
- Current check: `9 >= 10 && 12 <= 18` → **FALSE** (fails incorrectly!)
- Should be: Check if time slot **overlaps** with operating hours → **TRUE**

**Correct Logic Should Be**:
```typescript
// Check if time slot overlaps with operating hours
if (slotRange.start < closeHour && slotRange.end > openHour) {
  return { fits: true, ... };
}
```

This correctly identifies overlap: `9 < 18 && 12 > 10` → **TRUE** ✅

**Impact**: Locations that open mid-slot (e.g., 10am for a 9am-12pm slot) are incorrectly flagged as "not fitting" even though they're perfectly usable.

### Why Issues Occur

1. **Buggy Opening Hours Logic** ⚠️ **PRIMARY ISSUE**:
   - Overly strict overlap check causes false negatives
   - Locations that open at 10am incorrectly flagged for 9am-12pm slots
   - This is likely the cause of the Kyoto location issue

2. **Scoring System Allows Trade-offs**:
   - High interest match or rating can compensate for opening hours issues
   - System prioritizes variety and interest match over logistics

3. **Opening Hours Check Happens After Selection**:
   - Location selected based on score
   - Opening hours validated but doesn't prevent selection
   - Issue flagged but location still included

4. **No Hard Constraints**:
   - System uses soft constraints (penalties)
   - No hard filters for critical issues
   - Allows "best available" even if imperfect

5. **Time Slot Assignment**:
   - Time slots assigned before checking opening hours
   - May assign morning slot to location that opens at 10am
   - Should validate before assignment

## Recommendations

### Immediate Fixes

1. **Fix Opening Hours Overlap Logic** ⚠️ **CRITICAL**:
   ```typescript
   // In checkOpeningHoursFit, fix the overlap check
   // Current (buggy):
   if (slotRange.start >= openHour && slotRange.end <= closeHour) {
   
   // Fixed:
   if (slotRange.start < closeHour && slotRange.end > openHour) {
     return {
       fits: true,
       reasoning: `Open during ${timeSlot} (${period.open}-${period.close})`,
     };
   }
   ```
   This will correctly identify when a time slot overlaps with operating hours.

2. **Add Hard Filter for Opening Hours**:
   ```typescript
   // In pickLocationForTimeSlot, filter out locations that don't fit opening hours
   const openingHoursCheck = checkOpeningHoursFit(location, timeSlot, date);
   if (!openingHoursCheck.fits) {
     continue; // Skip this location
   }
   ```

3. **Improve Time Slot Assignment**:
   - Check opening hours before assigning time slot
   - Assign to optimal time slot that matches opening hours
   - Fall back to other slots if needed

4. **Add Issue Count Tracking**:
   - Track issues during generation
   - Display count in map/UI
   - Allow filtering by issue type

### Long-term Improvements

1. **Pre-filter by Constraints**:
   - Filter out locations that violate hard constraints first
   - Then score remaining candidates
   - Prevents high-scoring but problematic locations

2. **Two-Phase Selection**:
   - Phase 1: Filter by hard constraints (opening hours, accessibility, budget)
   - Phase 2: Score and rank remaining candidates
   - Ensures all selected locations meet minimum requirements

3. **Issue Severity Levels**:
   - Critical: Closed, inaccessible, exceeds budget significantly
   - Warning: Suboptimal time, busy, requires reservation
   - Info: Minor optimizations available

4. **Real-time Validation**:
   - Re-check availability when itinerary is viewed
   - Update issue count dynamically
   - Allow user to see and resolve issues

## Code Locations

### Key Files

- **Scoring Logic**: `src/lib/scoring/locationScoring.ts`
- **Time Optimization**: `src/lib/scoring/timeOptimization.ts`
- **Location Selection**: `src/lib/itineraryGenerator.ts` (lines 750-841)
- **Availability Check**: `src/app/api/itinerary/availability/route.ts`
- **UI Display**: `src/components/features/itinerary/PlaceActivityRow.tsx` (lines 209-251)

### Critical Functions

- `scoreLocation()` - Main scoring function
- `checkOpeningHoursFit()` - Validates opening hours
- `pickLocationForTimeSlot()` - Selects location for time slot
- `checkAvailability()` - Checks real-time availability

## Testing Recommendations

1. **Test Opening Hours Edge Cases**:
   - Location opens at 10am, scheduled for 9am
   - Location closes at 5pm, scheduled for 6pm
   - Location closed on specific weekday

2. **Test Availability Scenarios**:
   - Closed locations
   - Busy locations
   - Reservation-required locations

3. **Test Logistical Constraints**:
   - Very distant locations (>10km)
   - Duration exceeds time slot
   - Multiple issues on same location

4. **Test Scoring Edge Cases**:
   - High score but critical issue
   - Low score but no issues
   - Multiple locations with same score

## Conclusion

The recommendation system is sophisticated but has **two critical issues**:

1. **Bug in Opening Hours Check** 🐛: The overlap logic is incorrect, causing false negatives for locations that open mid-slot (e.g., 10am for a 9am-12pm slot). This is likely the **primary cause** of the Kyoto location issue.

2. **Soft Constraint System**: The system allows locations with critical issues to be selected if they score high on other factors, prioritizing match quality over feasibility.

**Priority Actions**:
1. **Fix opening hours overlap logic** (CRITICAL - likely fixes the Kyoto issue)
2. Add hard filter for opening hours violations
3. Improve time slot assignment logic
4. Add issue tracking and display
5. Implement pre-filtering by constraints

The system needs to balance between "best match" and "practical feasibility" - currently it leans too heavily toward match quality over feasibility, and the buggy opening hours check compounds this problem.

