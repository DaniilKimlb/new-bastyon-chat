export const getAddressFromPubKey = (
  pubKey: Buffer,
  type: string = "p2pkh"
): string | undefined => {
  if (!pubKey) {
    return undefined;
  }

  const payment = bitcoin.payments[type]({ pubkey: pubKey });
  return payment.address;
};
