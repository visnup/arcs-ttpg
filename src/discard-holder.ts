import { Card, CardHolder, Player, refHolder } from "@tabletop-playground/api";

refHolder.onCardFlipped.add(sortCard);
refHolder.onInserted.add(sortCard);

function sortCard(
  holder: CardHolder,
  card: Card,
  _player: Player,
  inserted: number = holder.getNumCards(),
) {
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
    // belongs at the end
    holder.moveCard(card, holder.getNumCards());
  }
}
