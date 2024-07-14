const { refHolder } = require("@tabletop-playground/api");

refHolder.onCardFlipped.add(sortCard);
refHolder.onInserted.add(sortCard);

function sortCard(holder, card, _player, inserted) {
  if (!holder.isCardFaceUp(card)) {
    // move to end
    holder.moveCard(card, holder.getNumCards());
  } else {
    // put it in order
    const index = card.getCardDetails().index;
    const cards = holder.getCards();
    for (let i = 0; i < cards.length; i++) {
      if (
        cards[i].getCardDetails().index > index ||
        !holder.isCardFaceUp(cards[i])
      ) {
        holder.moveCard(card, i - (i > inserted ? 1 : 0));
        return;
      }
    }
  }
}
