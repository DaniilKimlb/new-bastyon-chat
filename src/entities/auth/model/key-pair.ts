class KeyPair {
  private determineKeyPairSource(
    cryptoCredential: string
  ): "mnemonic" | "privateKey" {
    return bitcoin.bip39.validateMnemonic(cryptoCredential)
      ? "mnemonic"
      : "privateKey";
  }

  private getFromMnemonic(mnemonic: string) {
    const seed = bitcoin.bip39.mnemonicToSeedSync(mnemonic);
    const node = bitcoin.bip32.fromSeed(seed);
    const childNode = node.derivePath(`m/44'/0'/0'/0'`);
    const wif = childNode.toWIF();
    return bitcoin.ECPair.fromWIF(wif);
  }

  private getFromPrivateKey(privateKey: string) {
    try {
      const buffer = Buffer.from(privateKey, "hex");
      return bitcoin.ECPair.fromPrivateKey(buffer);
    } catch {
      return bitcoin.ECPair.fromWIF(privateKey);
    }
  }

  create(cryptoCredential: string): {
    privateKey: Buffer;
    publicKey: Buffer;
  } {
    const keyPairSource = this.determineKeyPairSource(cryptoCredential);
    return keyPairSource === "mnemonic"
      ? this.getFromMnemonic(cryptoCredential)
      : this.getFromPrivateKey(cryptoCredential);
  }
}

export const createKeyPair = (cryptoCredential: string) => {
  return new KeyPair().create(cryptoCredential);
};
