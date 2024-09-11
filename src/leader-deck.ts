import type { MultistateObject } from "@tabletop-playground/api";
import { refCard, world } from "@tabletop-playground/api";
import { removeCampaign } from "./setup-deck";

if (refCard.getStackSize() > 1)
  refCard.onPrimaryAction.add(() => {
    world.getObjectByTemplateName<MultistateObject>("base-rules")?.setState(20);
    removeCampaign();
  });
