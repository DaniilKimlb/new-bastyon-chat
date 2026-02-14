import { EAppProviders } from "@/app/providers/types";
import { inject } from "vue";

export function useAppRoutes() {
  return inject(EAppProviders.AppRoutes)!;
}
