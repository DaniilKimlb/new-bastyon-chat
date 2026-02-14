export class PocketnetInstanceConfigurator {
  static setTimeDifference(value: number) {
    window.POCKETNETINSTANCE.platform.timeDifference = value;
  }

  static setUserAddress(value: string) {
    window.POCKETNETINSTANCE.user.address.value = value;
  }

  static setUserGetKeyPairFc(getKeyPairFc: () => { privateKey: Buffer; publicKey: Buffer }) {
    window.POCKETNETINSTANCE.user.keys = getKeyPairFc;
  }
}
