import { useEffect, useRef, useState } from "react";
import { cacheLocationDetails } from "@/state/locationDetailsStore";
import type { LocationDetails } from "@/types/location";
import { logger } from "@/lib/logger";

type FetchStatus = "idle" | "loading" | "success" | "error";

export function useLocationDetails(locationId: string | null) {
  const cacheRef = useRef<Map<string, LocationDetails>>(new Map());
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [details, setDetails] = useState<LocationDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!locationId) {
      setStatus("idle");
      setDetails(null);
      setErrorMessage(null);
      return;
    }

    const cachedDetails = cacheRef.current.get(locationId);
    if (cachedDetails) {
      setDetails(cachedDetails);
      setStatus("success");
      setErrorMessage(null);
      cacheLocationDetails(locationId, cachedDetails);
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const fetchDetails = async () => {
      try {
        setStatus("loading");
        setErrorMessage(null);
        setDetails(null);

        const response = await fetch(`/api/locations/${locationId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          let message = `Request failed with status ${response.status}.`;
          try {
            const payload = await response.json();
            if (payload?.error) {
              message = payload.error as string;
            }
          } catch (jsonError) {
            logger.debug("Unable to parse error response", { error: jsonError });
          }
          throw new Error(message);
        }

        const payload = (await response.json()) as { details: LocationDetails };

        if (!isMounted) {
          return;
        }

        cacheRef.current.set(locationId, payload.details);
        cacheLocationDetails(locationId, payload.details);
        setDetails(payload.details);
        setStatus("success");
      } catch (error) {
        if (!isMounted || controller.signal.aborted) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong while loading this place.";
        setErrorMessage(message);
        setStatus("error");
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [locationId, reloadToken]);

  const retry = () => {
    if (!locationId) return;
    cacheRef.current.delete(locationId);
    setReloadToken((value) => value + 1);
  };

  return {
    status,
    details,
    errorMessage,
    retry,
  };
}

