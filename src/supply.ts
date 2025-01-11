import type { Card } from "@tabletop-playground/api";
import { refObject } from "@tabletop-playground/api";

const resource = refObject.getSnapPoint(0)?.getSnappedObject() as
  | Card
  | undefined;
if (resource) {
  resource.getAllCardDetails();
}
