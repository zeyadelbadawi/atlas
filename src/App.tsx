/**
 * Application root.
 *
 * Deliberately minimal: it composes the provider stack with the router and
 * nothing else. Every concern lives in a dedicated layer, so this file is not
 * expected to change as modules are added in later prompts.
 */
import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "@app/providers";
import { AppRouter } from "@app/routes";

export default function App(): JSX.Element {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AppProviders>
  );
}
