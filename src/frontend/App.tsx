import React from "react";

import { renderFrontendApp } from "./renderFrontendApp.ts";

export { renderFrontendApp };

export function FrontendApp() {
  return <div dangerouslySetInnerHTML={{ __html: renderFrontendApp(globalThis.location?.pathname ?? "/") }} />;
}
