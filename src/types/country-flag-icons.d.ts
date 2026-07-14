// ---------------------------------------------------------------------------
// Ambient declarations for country-flag-icons/react/3x2
// The bundled types use HTMLSVGElement (HTMLElement & SVGElement) which is
// incompatible with React's SVGProps<SVGSVGElement>. We override the module
// to export components typed as ComponentType<SVGProps<SVGSVGElement>> so
// they compose seamlessly with DropdownSelect and other UI components.
// ---------------------------------------------------------------------------

declare module "country-flag-icons/react/3x2" {
  import type { ComponentType, SVGProps } from "react";

  type FlagComponent = ComponentType<SVGProps<SVGSVGElement>>;

  export const US: FlagComponent;
  export const GB: FlagComponent;
  export const ES: FlagComponent;
  export const MX: FlagComponent;
  export const AR: FlagComponent;
  export const CO: FlagComponent;
  export const CL: FlagComponent;
  export const PE: FlagComponent;
  export const VE: FlagComponent;
  export const EC: FlagComponent;
  export const GT: FlagComponent;
  export const BO: FlagComponent;
  export const PT: FlagComponent;
  export const BR: FlagComponent;
  export const FR: FlagComponent;
  export const CA: FlagComponent;
  export const BE: FlagComponent;
  export const DE: FlagComponent;
  export const AT: FlagComponent;
  export const CH: FlagComponent;
  export const IT: FlagComponent;
  export const JP: FlagComponent;
  export const KR: FlagComponent;
  export const CN: FlagComponent;
  export const TW: FlagComponent;
  export const SA: FlagComponent;
  export const EG: FlagComponent;
  export const AE: FlagComponent;
  export const MA: FlagComponent;
  export const RU: FlagComponent;
  export const IN: FlagComponent;
}
