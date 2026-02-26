declare module "vue-virtual-scroller" {
  import type { DefineComponent } from "vue";
  export const RecycleScroller: DefineComponent<any, any, any>;
  export const DynamicScroller: DefineComponent<any, any, any>;
  export const DynamicScrollerItem: DefineComponent<any, any, any>;
}

declare module "miscreant" {
  export class SIV {
    static importKey(
      keyData: Uint8Array,
      algorithm: string,
      provider?: unknown
    ): Promise<SIV>;
    seal(plaintext: Uint8Array, associatedData: Uint8Array[]): Promise<Uint8Array>;
    open(ciphertext: Uint8Array, associatedData: Uint8Array[]): Promise<Uint8Array>;
  }
}
