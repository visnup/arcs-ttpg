import type { Button, VerticalBox } from "@tabletop-playground/api";
import {
  refObject as _refObject,
  Rotator,
  UIElement,
  Vector,
  world,
  type GameObject,
} from "@tabletop-playground/api";
import { jsxInTTPG, render, useRef } from "jsx-in-ttpg";
import { createReset } from "./lib/reset";
import { afterEach, beforeEach, run, suites } from "./tests/suite";

const refObject = _refObject;

const reset = createReset(refObject);

(async () => {
  beforeEach(reset, true);
  afterEach(() => process.nextTick(updateButtons), true);

  // Import tests
  for (const p of world.getAllowedPackages())
    for (const script of p.getScriptFiles().sort())
      if (/^tests\/.*\.test\.js$/.test(script)) await import(`./${script}`);

  // UI
  const ui = Object.assign(new UIElement(), {
    position: new Vector(0, 0, 24),
    rotation: new Rotator(70, 0, 0),
    widget: render(
      <verticalbox gap={0}>
        <button onClick={() => run()}>Run all</button>
        <button onClick={reset}>Reset</button>
      </verticalbox>,
    ),
  });
  const buttons = suites.map((suite) => {
    const { description, run } = suite;
    const ref = useRef<Button>();
    (ui.widget as VerticalBox).addChild(
      render(
        <button ref={ref} onClick={() => run()}>
          {description}
        </button>,
      ),
    );
    return [ref, suite] as const;
  });
  refObject.addUI(ui);

  function updateButtons() {
    for (const [button, { description, results }] of buttons)
      button.current?.setText(
        `${description} ${results.map((d) => ("skipped" in d ? "?" : d.ok ? "." : "x")).join("")}`,
      );
  }
})();

export type TestableObject = GameObject & {
  reset: typeof reset;
};
(refObject as TestableObject).reset = reset;
