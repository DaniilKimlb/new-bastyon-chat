/** Typed bridge to global SDK objects */

export function getBitcoinLib(): BitcoinLib {
  if (typeof bitcoin === "undefined") {
    throw new Error("Bitcoin SDK not loaded");
  }
  return bitcoin;
}

export function getPocketnetInstance(): PocketnetInstanceType {
  return window.POCKETNETINSTANCE;
}
