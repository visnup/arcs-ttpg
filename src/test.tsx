import type { Button, VerticalBox } from "@tabletop-playground/api";
import {
  refObject as _refObject,
  UIElement,
  Vector,
  world,
} from "@tabletop-playground/api";
import { jsxInTTPG, render, useRef } from "jsx-in-ttpg";
import { createReset } from "./lib/reset";
import { beforeEach, run, suites } from "./tests/suite";

const refObject = _refObject;

const reset = createReset(refObject);

(async () => {
  beforeEach(reset, true);

  // Import tests
  for (const p of world.getAllowedPackages())
    for (const script of p.getScriptFiles().sort())
      if (script.match(/^tests\/.*\.test\.js$/)) await import(`./${script}`);

  // UI
  const ui = Object.assign(new UIElement(), {
    position: new Vector(0, 0, 1),
    widget: render(
      <verticalbox>
        <button onClick={() => run().then(updateButtons)}>Run all</button>
        <button onClick={reset}>Reset</button>
      </verticalbox>,
    ),
  });
  const buttons = suites.map((suite) => {
    const { description, run } = suite;
    const ref = useRef<Button>();
    (ui.widget as VerticalBox).addChild(
      render(
        <button ref={ref} onClick={() => run().then(updateButtons)}>
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
