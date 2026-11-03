// mapbox-gl ships no types for its CSP entry point; its API is the same as the
// default build's.
declare module 'mapbox-gl/dist/mapbox-gl-csp.js' {
  import mapboxgl from 'mapbox-gl'

  export default mapboxgl
}
