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
  const ui = new UIElement();
  ui.position = new Vector(0, 0, 1);
  ui.widget = render(<verticalbox />);
  (ui.widget as VerticalBox).addChild(
    render(<button onClick={() => run().then(updateButtons)}>Run all</button>),
  );
  (ui.widget as VerticalBox).addChild(
    render(<button onClick={reset}>Reset</button>),
  );
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
        `${description} ${results.map((d) => (d.skipped ? "?" : d.ok ? "." : "x")).join("")}`,
      );
  }
})();
