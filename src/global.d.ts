/* eslint-disable no-var */

/** Bastyon SDK global type declarations */

interface BitcoinLib {
  crypto: {
    sha256(data: Buffer): Buffer;
    hash160(data: Buffer): Buffer;
    ripemd160(data: Buffer): Buffer;
  };
  bip39: {
    validateMnemonic(mnemonic: string): boolean;
    mnemonicToSeedSync(mnemonic: string): Buffer;
    entropyToMnemonic(entropy: Buffer): string;
  };
  bip32: {
    fromSeed(seed: Buffer): {
      derivePath(path: string): {
        toWIF(): string;
        privateKey: Buffer;
        publicKey: Buffer;
      };
    };
  };
  ECPair: {
    fromWIF(wif: string): { privateKey: Buffer; publicKey: Buffer };
    fromPrivateKey(buffer: Buffer): { privateKey: Buffer; publicKey: Buffer };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ecc: any;
  payments: {
    p2pkh(opts: { pubkey: Buffer }): { address: string };
    [key: string]: (opts: { pubkey: Buffer }) => { address: string };
  };
}

interface PocketnetInstanceType {
  apiHandlers: { error: () => null; success: () => null };
  menuOpen: () => void;
  mobile: { supportimagegallery: () => null };
  options: {
    address: string;
    backmap: undefined;
    device: string;
    fingerPrint: string;
    firebase: string;
    fullName: string;
    imageServer: string;
    imageServerup1: string;
    imageStorage: string;
    listofnodes: null;
    listofproxies: Array<{ host: string; port: number; wss: number }>;
    localStoragePrefix: string;
    matrix: string;
    name: string;
    nav: { navPrefix: string };
    rtc: string;
    rtchttp: string;
    rtcws: string;
    server: string;
    url: string;
  };
  platform: {
    matrixchat: { link: () => null };
    sdk: {
      syncStorage: {
        eventListeners: Record<string, Record<string, (e: StorageEvent) => void>>;
        init(): void;
        off(eventType: string, lStorageProp: string): void;
        on(eventType: string, lStorageProp: string, callback: (e: StorageEvent) => void): void;
      };
    };
    timeDifference: number;
    whiteList: string[];
  };
  user: {
    address: { value: string | null };
    keys: (() => { privateKey: Buffer; publicKey: Buffer }) | null;
  };
}

declare var bitcoin: BitcoinLib;
declare var Api: new (instance: PocketnetInstanceType) => {
  initIf(): Promise<void>;
  rpc(method: string): Promise<{ time: number }>;
  wait: { ready(type: string, timeout: number): Promise<void> };
  ready: { use: boolean };
};
declare var Actions: new (instance: PocketnetInstanceType, api: InstanceType<typeof Api>) => {
  init(): void;
  prepare(): void;
  addAccount(address: string): void;
  addActionAndSendIfCan(info: unknown, arg: null, address: string): Promise<unknown>;
};
declare var pSDK: new (opts: {
  actions: InstanceType<typeof Actions>;
  api: InstanceType<typeof Api>;
  app: PocketnetInstanceType;
}) => {
  userInfo: {
    load(addresses: string[]): Promise<void>;
    get(address: string): UserDataSDK;
  };
};
declare var UserInfo: new () => {
  name: { set(v: string): void };
  language: { set(v: string): void };
  about: { set(v: string): void };
  site: { set(v: string): void };
  image: { set(v: string): void };
  addresses: { set(v: string[]): void };
  ref: { set(v: unknown): void };
  keys: { set(v: unknown): void };
};
declare var superXSS: (value: string) => string;

interface UserDataSDK {
  about: string;
  addresses: string[];
  image: string;
  keys: unknown;
  language: string;
  name: string;
  ref: unknown;
  site: string;
}

interface Window {
  POCKETNETINSTANCE: PocketnetInstanceType;
  testpocketnet: boolean;
  storage_tab: number;
}
