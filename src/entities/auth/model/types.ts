import type { UserData } from "@/app/providers/initializers/types";

export interface AuthData {
  address: string | null;
  privateKey: string | null;
}

export type { UserData };
