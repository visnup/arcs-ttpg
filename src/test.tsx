import type { Button, VerticalBox } from "@tabletop-playground/api";
import {
  refObject as _refObject,
  UIElement,
  Vector,
  world,
} from "@tabletop-playground/api";
import { jsxInTTPG, render, useRef } from "jsx-in-ttpg";
import { beforeEach, run, suites } from "./tests/suite";

const refObject = _refObject;

const saved = world
  .getAllObjects()
  .filter((obj) => obj !== refObject)
  .map((obj) => [obj.toJSONString(), obj.getPosition()] as const);
const keys = new Set(Object.keys(world));

function reset() {
  for (const zone of world.getAllZones())
    if (zone.getId().startsWith("zone-")) zone.destroy();
  for (const obj of world.getAllObjects()) if (obj !== refObject) obj.destroy();
  // @ts-expect-error delete
  for (const key of Object.keys(world)) if (!keys.has(key)) delete world[key];
  for (const [json, p] of saved) world.createObjectFromJSON(json, p)!;
}

(async () => {
  beforeEach(reset);

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
        `${description} ${results.map((d) => (d.ok ? "√" : "x")).join("")}`,
      );
  }
})();
