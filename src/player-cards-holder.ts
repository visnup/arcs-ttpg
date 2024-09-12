import { refHolder } from "@tabletop-playground/api";

// Sort action cards
Object.assign(refHolder, {
  sort: function (this: typeof refHolder) {
    for (const [i, card] of this.getCards()
      .sort(
        (a, b) =>
          a.getTemplateName().localeCompare(b.getTemplateName()) ||
          a.getCardDetails(0)!.index - b.getCardDetails(0)!.index,
      )
      .entries())
      this.moveCard(card, i);
  },
});
