/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

declare module '@vue-leaflet/vue-leaflet' {
  import type { DefineComponent } from 'vue'
  export const LMap: DefineComponent<any, any, any>
  export const LTileLayer: DefineComponent<any, any, any>
  export const LMarker: DefineComponent<any, any, any>
  export const LPopup: DefineComponent<any, any, any>
  export const LPolyline: DefineComponent<any, any, any>
  export const LIcon: DefineComponent<any, any, any>
  export const LCircle: DefineComponent<any, any, any>
  export const LCircleMarker: DefineComponent<any, any, any>
}
