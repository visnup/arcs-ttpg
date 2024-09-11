import { refCard } from "@tabletop-playground/api";
import { removeCampaign } from "./setup-deck";

if (refCard.getStackSize() > 1) refCard.onPrimaryAction.add(removeCampaign);
