/**
 * Utility functions ported from bastyon-chat/src/application/functions.js
 * Only the functions actually used by the Matrix integration are included.
 */

// @ts-expect-error — no types for create-hash
import createHash from "create-hash";

export function sha224(text: string): Buffer {
  return createHash("sha224").update(text).digest();
}

export function deep(obj: unknown, key: string | string[]): unknown {
  const parts = Array.isArray(key) ? key : key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function areArraysEqual<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

const hexDecodeCache: Record<string, string> = {};

export function hexEncode(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    let ch = text.charCodeAt(i);
    if (ch > 0xff) ch -= 0x350;
    let hex = ch.toString(16);
    while (hex.length < 2) hex = "0" + hex;
    result += hex;
  }
  return result;
}

export function hexDecode(hex: string): string {
  if (hexDecodeCache[hex]) return hexDecodeCache[hex];
  let result = "";
  for (let i = 2; i <= hex.length; i += 2) {
    let ch = parseInt(hex.substring(i - 2, i), 16);
    if (ch >= 128) ch += 0x350;
    result += String.fromCharCode(parseInt("0x" + ch.toString(16)));
  }
  hexDecodeCache[hex] = result;
  return result;
}

export function getmatrixid(str: string | undefined | null): string {
  return str?.split(":")[0]?.replace("@", "") ?? "";
}

export function getmatrixidFA(str: string | undefined | null): string {
  return str?.split(":")[0] ?? "";
}

export function makeid(valid?: unknown): string {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  if (!valid) {
    return (
      s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4()
    );
  }

  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < 16; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

/** Poll until condition is true */
export function pretry(fn: () => boolean, time?: number, totalTime?: number): Promise<void> {
  return new Promise((resolve) => {
    retry(fn, resolve, time, totalTime);
  });
}

export function retry(fn: () => boolean, clbk?: () => void, time?: number, totalTime?: number): void {
  if (fn()) {
    clbk?.();
    return;
  }
  const interval = time ?? 20;
  let elapsed = 0;
  const id = setInterval(() => {
    elapsed += interval;
    if (fn() || (totalTime && elapsed >= totalTime)) {
      clearInterval(id);
      clbk?.();
    }
  }, interval);
}

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// MD5 implementation (ported as-is for hash compatibility)
function md5_cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
}
function md5_ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5_cmn((b & c) | (~b & d), a, b, x, s, t);
}
function md5_gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5_cmn((b & d) | (c & ~d), a, b, x, s, t);
}
function md5_hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5_cmn(c ^ (b | ~d), a, b, x, s, t);
}
function safe_add(x: number, y: number): number {
  const lsw = (x & 0xffff) + (y & 0xffff);
  return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff);
}
function bit_rol(num: number, cnt: number): number {
  return (num << cnt) | (num >>> (32 - cnt));
}
function str2binl(str: string): number[] {
  const bin: number[] = [];
  const mask = (1 << 8) - 1;
  for (let i = 0; i < str.length * 8; i += 8) {
    bin[i >> 5] |= (str.charCodeAt(i / 8) & mask) << i % 32;
  }
  return bin;
}
function binl2str(bin: number[]): string {
  let str = "";
  for (let i = 0; i < bin.length * 32; i += 8) {
    str += String.fromCharCode((bin[i >> 5] >>> i % 32) & 0xff);
  }
  return str;
}
function binl_md5(x: number[], len: number): number[] {
  x[len >> 5] |= 0x80 << len % 32;
  x[14 + (((len + 64) >>> 9) << 4)] = len;
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const aa = a, bb = b, cc = c, dd = d;
    a = md5_ff(a, b, c, d, x[i], 7, -680876936);
    d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = md5_gg(b, c, d, a, x[i], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
    d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = md5_hh(d, a, b, c, x[i], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = md5_ii(a, b, c, d, x[i], 6, -198630844);
    d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = safe_add(a, aa); b = safe_add(b, bb); c = safe_add(c, cc); d = safe_add(d, dd);
  }
  return [a, b, c, d];
}
function binl2hex(binarray: number[]): string {
  const hexTab = "0123456789ABCDEF";
  let str = "";
  for (let i = 0; i < binarray.length * 4; i++) {
    str += hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xf) +
           hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xf);
  }
  return str;
}

export function md5(str: string): string {
  return binl2hex(binl_md5(str2binl(str), str.length * 8)).toLowerCase();
}

export function readFile(file: Blob): Promise<ArrayBuffer> {
  const reader = new FileReader();
  reader.readAsArrayBuffer(file);
  return new Promise((resolve, reject) => {
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
  });
}

export function fetchLocal(url: string): Promise<{ data: Blob }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      resolve({ data: xhr.response as Blob });
    };
    xhr.onerror = () => reject(new Error("fetch failed"));
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.send();
  });
}

export function processArray<T>(array: T[], fn: (item: T) => Promise<unknown>): Promise<void> {
  let index = 0;
  function next(): Promise<void> {
    if (index >= array.length) return Promise.resolve();
    const item = array[index++];
    return fn(item).then(next);
  }
  return next();
}

/** Base64 encode/decode (custom implementation matching bastyon-chat) */
export const Base64 = {
  _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

  encode(input: string): string {
    let output = "";
    let i = 0;
    const str = Base64._utf8_encode(input);
    while (i < str.length) {
      const chr1 = str.charCodeAt(i++);
      const chr2 = str.charCodeAt(i++);
      const chr3 = str.charCodeAt(i++);
      let enc1 = chr1 >> 2;
      let enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      let enc4 = chr3 & 63;
      if (isNaN(chr2)) { enc3 = enc4 = 64; }
      else if (isNaN(chr3)) { enc4 = 64; }
      output += Base64._keyStr.charAt(enc1) + Base64._keyStr.charAt(enc2) +
                Base64._keyStr.charAt(enc3) + Base64._keyStr.charAt(enc4);
    }
    return output;
  },

  decode(input: string): string {
    let output = "";
    let i = 0;
    input = input.replace(/[^A-Za-z0-9+/=]/g, "");
    while (i < input.length) {
      const enc1 = Base64._keyStr.indexOf(input.charAt(i++));
      const enc2 = Base64._keyStr.indexOf(input.charAt(i++));
      const enc3 = Base64._keyStr.indexOf(input.charAt(i++));
      const enc4 = Base64._keyStr.indexOf(input.charAt(i++));
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      output += String.fromCharCode(chr1);
      if (enc3 !== 64) output += String.fromCharCode(chr2);
      if (enc4 !== 64) output += String.fromCharCode(chr3);
    }
    return Base64._utf8_decode(output);
  },

  _utf8_encode(str: string): string {
    str = str.replace(/\r\n/g, "\n");
    let utftext = "";
    for (let n = 0; n < str.length; n++) {
      const c = str.charCodeAt(n);
      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if (c > 127 && c < 2048) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  },

  _utf8_decode(utftext: string): string {
    let str = "";
    let i = 0;
    while (i < utftext.length) {
      const c = utftext.charCodeAt(i);
      if (c < 128) { str += String.fromCharCode(c); i++; }
      else if (c > 191 && c < 224) {
        const c2 = utftext.charCodeAt(i + 1);
        str += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        i += 2;
      } else {
        const c2 = utftext.charCodeAt(i + 1);
        const c3 = utftext.charCodeAt(i + 2);
        str += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        i += 3;
      }
    }
    return str;
  },

  fromFile(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  },

  toFileFetch(base64: string): Promise<File> {
    return fetch(base64)
      .then((res) => res.blob())
      .then((blob) => new File([blob], "File name", { type: "image/png" }));
  }
};
