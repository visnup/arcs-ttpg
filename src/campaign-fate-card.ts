import { refCard } from "@tabletop-playground/api";

refCard.onPrimaryAction.add((card) => {
  if (card.getStackSize() > 1) return;
  console.log("hi");
});
