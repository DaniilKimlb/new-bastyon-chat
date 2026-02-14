import { routeName as chat } from "./routes/chat";
import { routeName as login } from "./routes/login";
import { routeName as profile } from "./routes/profile";
import { routeName as profileEdit } from "./routes/profile-edit";
import { routeName as settings } from "./routes/settings";
import { routeName as welcome } from "./routes/welcome";

export const pages = {
  chat,
  login,
  profile,
  profileEdit,
  settings,
  welcome
} as const;
