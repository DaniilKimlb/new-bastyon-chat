import type { UserData } from "./types";

import { PocketnetInstanceConfigurator } from "../chat-scripts";
import { PocketnetInstance } from "../chat-scripts/config/pocketnetinstance";

type OnLoadUserData = (userData: UserData) => void;

export class AppInitializer {
  private actions!: InstanceType<typeof Actions>;
  private api!: InstanceType<typeof Api>;
  private psdk!: InstanceType<typeof pSDK>;

  constructor(pocketnetInstance: PocketnetInstanceType) {
    this.api = new Api(pocketnetInstance);
    this.actions = new Actions(pocketnetInstance, this.api);
    this.actions.init();
    this.psdk = new pSDK({
      actions: this.actions,
      api: this.api,
      app: pocketnetInstance
    });
  }

  private syncNodeTime() {
    return this.api.rpc("getnodeinfo").then(getnodeinfoResult => {
      const timeDifference =
        getnodeinfoResult.time - Math.floor(new Date().getTime() / 1000);
      PocketnetInstanceConfigurator.setTimeDifference(timeDifference);
      this.actions.prepare();
    });
  }

  async editUserData({
    address,
    userData
  }: {
    address: string;
    userData: UserData;
  }) {
    const userInfo = new UserInfo();
    userInfo.name.set(superXSS(userData.name));
    userInfo.language.set(superXSS(userData.language));
    userInfo.about.set(superXSS(userData.about));
    userInfo.site.set(superXSS(userData.site));
    userInfo.image.set(superXSS(userData.image));
    userInfo.addresses.set(userData.addresses);
    userInfo.ref.set(userData.ref);
    userInfo.keys.set(userData.keys);

    return this.actions.addActionAndSendIfCan(userInfo, null, address);
  }

  initApi() {
    return this.api.initIf();
  }

  initializeAndFetchUserData(address: string, onLoad?: OnLoadUserData) {
    return this.initApi().then(() => {
      return this.waitForApiReady().then(canUse => {
        if (canUse) {
          this.syncNodeTime();
          this.actions.addAccount(address);
          return this.loadUserData([address], onLoad);
        }
        return null;
      });
    });
  }

  loadUserData(
    stateAddresses: string[],
    onLoad?: OnLoadUserData
  ): Promise<UserData | null> {
    if (stateAddresses.length) {
      return this.psdk.userInfo.load(stateAddresses).then(() => {
        const userData = this.psdk.userInfo.get(stateAddresses[0]) as UserData;
        if (onLoad) {
          onLoad(userData);
        }
        return userData;
      });
    }
    return Promise.resolve(null);
  }

  /** Load user info for multiple addresses (for encryption key resolution) */
  async loadUsersInfo(addresses: string[]): Promise<void> {
    if (!addresses.length) return;
    await this.psdk.userInfo.load(addresses);
  }

  /** Get cached user data by raw address */
  getUserData(address: string): UserData | null {
    try {
      return this.psdk.userInfo.get(address) as UserData | null;
    } catch {
      return null;
    }
  }

  waitForApiReady() {
    return this.api.wait.ready("use", 1000).then(() => {
      return this.api.ready.use;
    });
  }
}

export const createAppInitializer = (): AppInitializer => {
  return new AppInitializer(PocketnetInstance);
};
