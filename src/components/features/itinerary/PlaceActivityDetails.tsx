import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { easeReveal, durationFast } from "@/lib/motion";
import type { Location } from "@/types/location";
import type { ActivityTip } from "@/lib/tips/tipGenerator";

type LocationDetails = {
  editorialSummary?: string;
  regularOpeningHours?: string[];
  formattedAddress?: string;
};

type PlaceActivityDetailsProps = {
  isExpanded: boolean;
  placeLocation: Location;
  locationDetails: LocationDetails | null;
  summary: string | null;
  tips: ActivityTip[];
};

/**
 * Expanded detail content for a place activity row.
 * Shows full description, operating hours, extra tips, and address.
 */
export function PlaceActivityDetails({
  isExpanded,
  placeLocation,
  locationDetails,
  summary,
  tips,
}: PlaceActivityDetailsProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={{ duration: durationFast, ease: easeReveal }}
          className="overflow-hidden"
        >
          {/* Full description — prefer location.description, then shortDescription, then editorialSummary */}
          {(() => {
            const best =
              (placeLocation?.description?.trim() || null) ??
              (placeLocation?.shortDescription?.trim() || null) ??
              (locationDetails?.editorialSummary?.trim() || null);
            return best && best !== summary ? (
              <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{best}</p>
            ) : null;
          })()}

          {/* Operating hours — only show if >= 3 days (filters out bad 1-day data) */}
          {locationDetails?.regularOpeningHours && locationDetails.regularOpeningHours.length >= 3 && (
            <div className="mt-3 rounded-lg bg-surface/70 p-2.5">
              <p className="mb-1.5 text-xs font-semibold text-foreground">Hours</p>
              <div className="space-y-0.5">
                {locationDetails.regularOpeningHours.slice(0, 7).map((hours, idx) => (
                  <p key={idx} className="text-[11px] text-foreground-secondary">{hours}</p>
                ))}
              </div>
            </div>
          )}

          {/* All tips when expanded (show more than 2) */}
          {tips.length > 2 && (
            <div className="mt-3 rounded-lg bg-sage/5 p-2.5">
              <p className="mb-1.5 text-xs font-semibold text-foreground">All Tips</p>
              <div className="space-y-1">
                {tips.slice(2).map((tip, index) => (
                  <div key={index} className="flex items-start gap-1.5 text-xs text-foreground-secondary">
                    <span className="shrink-0">{tip.icon ?? "💡"}</span>
                    <span>
                      <span className="font-medium">{tip.title}:</span> {tip.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Address if available */}
          {locationDetails?.formattedAddress && (
            <div className="mt-3 flex items-start gap-1.5 text-xs text-foreground-secondary">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{locationDetails.formattedAddress}</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
