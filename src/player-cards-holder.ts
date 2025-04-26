import { globalEvents, refHolder } from "@tabletop-playground/api";

// Sort action cards
Object.assign(refHolder, {
  sort: function (this: typeof refHolder) {
    for (const [i, card] of this.getCards()
      .sort(
        (a, b) =>
          a.getTemplateName().localeCompare(b.getTemplateName()) ||
          a.getCardDetails().index - b.getCardDetails().index,
      )
      .entries())
      this.moveCard(card, i);
  },
});

refHolder.onInserted.add((holder, card) => {
  if (card.getCardDetails().name.startsWith("Guild Supremacy"))
    globalEvents.onAmbitionShouldTally.trigger();
});
