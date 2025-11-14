import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";

/**
 * Custom render function for React components with providers
 * Use this instead of the default render from @testing-library/react
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, {
    ...options,
  });
}

export * from "@testing-library/react";
export { customRender as render };

