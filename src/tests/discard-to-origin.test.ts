import { world } from "@tabletop-playground/api";
import { assertEqual } from "./assert";
import { describe, test } from "./suite";

for (const name of ["ambition declared", "ambition"])
  describe(name, () => {
    test("discards to origin", () => {
      const marker = world.getObjectByTemplateName(name)!;
      const position = marker.getPosition();
      const rotation = marker.getRotation();
      marker.setPosition(position.add([10, 10, 0]));
      marker.setRotation([rotation.pitch, rotation.yaw + 90, rotation.roll]);
      if (!("discard" in marker && typeof marker.discard === "function"))
        throw Error("discard not present");
      marker.discard();
      assertEqual(marker.getPosition(), position, "position");
      if (name === "ambition declared")
        assertEqual(marker.getRotation(), rotation, "rotation");
      if (name === "ambition")
        assertEqual(marker.getRotation().yaw, rotation.yaw + 90, "rotation");
    });
  });
