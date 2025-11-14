/**
 * Web Vitals Performance Monitoring
 * Tracks Core Web Vitals and other performance metrics
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from "web-vitals";

type WebVitalsCallback = (metric: Metric) => void;

/**
 * Reports Web Vitals metrics to analytics service
 * In production, this can be extended to send to analytics platforms
 */
function reportWebVital(metric: Metric): void {
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Web Vital] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  }

  // In production, send to analytics service
  // Example: Google Analytics 4
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", metric.name, {
      event_category: "Web Vitals",
      value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Example: Send to custom analytics endpoint
  // if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
  //   fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(metric),
  //   }).catch(() => {
  //     // Silently fail if analytics endpoint is unavailable
  //   });
  // }
}

/**
 * Initialize Web Vitals tracking
 */
export function initWebVitals(onPerfEntry?: WebVitalsCallback): void {
  if (typeof window === "undefined") {
    return;
  }

  const reportMetric = (metric: Metric) => {
    reportWebVital(metric);
    if (onPerfEntry && typeof onPerfEntry === "function") {
      onPerfEntry(metric);
    }
  };

  // Core Web Vitals
  onCLS(reportMetric);
  onLCP(reportMetric);
  onINP(reportMetric); // Replaces onFID in web-vitals v4

  // Additional metrics
  onFCP(reportMetric);
  onTTFB(reportMetric);
}

