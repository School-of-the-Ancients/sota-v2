import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FrontendApp, renderFrontendApp } from "./App.tsx";

describe("FrontendApp", () => {
  it("renders the M1.5 React shell navigation", () => {
    render(<FrontendApp />);

    expect(screen.getByRole("heading", { name: /school of the ancients/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /frontend routes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start a goal/i })).toHaveAttribute("href", "/goals/new");
  });

  it("keeps provider secrets out of rendered browser markup", () => {
    const html = renderFrontendApp("/");

    expect(html).toMatch(/No browser-to-provider model calls/i);
    expect(html).not.toMatch(/api[_-]?key/i);
    expect(html).not.toMatch(/AIza|sk-/i);
  });
});
