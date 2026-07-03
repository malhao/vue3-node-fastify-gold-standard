import { onCLS, onINP, onLCP, type Metric } from 'web-vitals'

/** Core Web Vitals — observability.md §4's "do this first". Segmented by route for the
 * p75 field percentile at the aggregation layer. Reports to console for now; forward the
 * same payload to the Collector (or an RUM backend) once one is wired up. */
function report(metric: Metric): void {
  console.info('[web-vitals]', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    route: window.location.pathname,
  })
}

export function initWebVitals(): void {
  onLCP(report)
  onINP(report)
  onCLS(report)
}
