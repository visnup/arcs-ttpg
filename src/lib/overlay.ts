import {
  Card,
  world,
  type CardHolder,
  type GameObject,
} from "@tabletop-playground/api";
import { type CourtZone } from "../court";
import { type Ambition } from "../map-board";

type GameData = {
  campaign: boolean;
  players: PlayerData[];
  ambitions: AmbitionData[];
  court: CourtData[];
  discard: CardId[];
  // campaign
  edicts?: CardId[];
  laws?: CardId[];
};
type PlayerData = {
  name?: string; // board can be present without player
  color: PlayerColor;
  initiative: boolean;
  power: number;
  resources: (Resource | null)[];
  outrage: Resource[];
  cities: number;
  spaceports: number;
  ships: number;
  agents: number;
  cards: CardId[];
  guild: CardId[];
  // campaign
  fate?: CardId;
  objective?: number;
  favors?: PlayerRank;
  titles?: CardId[];
};
type AmbitionData = {
  id: Ambition;
  declared: number[];
  ranking: PlayerRank;
};
type CourtData = {
  id: CardId;
  influence: PlayerRank;
  // todo: attached
};
type CardId = string | null; // "1 Construction", null = face down
type Resource = "fuel" | "material" | "weapon" | "relic" | "psionic";
type PlayerColor = "FFB700" | "0095A9" | "E1533D" | "D7D2CB"; // | "912AAD";
type PlayerRank = number[]; // [2, 1, 7, 8] = yellow=2, blue=1, red=7, white=8

const isGuild = (d: GameObject): d is Card =>
  d instanceof Card && /^(bc|cc|lore|f\d+)$/.test(d.getTemplateName());
function cardId(d: undefined): undefined;
function cardId(d: Card): string | null;
function cardId(d: Card | undefined) {
  if (!d) return undefined;
  // todo: card ids instead of names
  return d.isFaceUp() ? d.getCardDetails().name.replace(/\n.*/s, "") : null;
}
const outragable = ["material", "fuel", "weapon", "relic", "psionic"] as const;
const track = world
  .getObjectById("map")!
  .getAllSnapPoints()
  .filter((p) => p.getTags().includes("power"))
  .map((p) => p.getGlobalPosition())
  .sort((a, b) => a.y - b.y);

export function sync() {
  const objects = world.getAllObjects().reduce(
    (acc, d) => {
      (acc[d.getTemplateName()] ||= []).push(d);
      return acc;
    },
    {} as Record<string, GameObject[]>,
  );
  const players = world.getAllPlayers();
  const initiative = world.getObjectById("initiative")!.getPosition();
  const hasInitiative = objects.board.sort(
    (a, b) =>
      a.getPosition().distance(initiative) -
      b.getPosition().distance(initiative),
  )[0];
  const power = objects.power
    .filter((d) => world.isOnMap(d))
    .sort((a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot())
    .map((d) => track.findIndex((p) => p.y > d.getPosition().y + 0.1));
  const objective = objects.objective
    ?.filter((d) => world.isOnMap(d))
    .sort((a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot())
    .map((d) => track.findIndex((p) => p.y > d.getPosition().y + 0.1));
  const starports = objects.starport.filter((d) => world.isOnTable(d));
  const ships = objects.ship.filter((d) => world.isOnTable(d));
  const agents = objects.agent.filter((d) => world.isOnTable(d));
  const discard = (objects.discard[0] as CardHolder).getCards().map(cardId);
  const court = objects.court[0]
    .getAllSnapPoints()
    .map((s, i) => {
      const card = s.getSnappedObject() as Card | undefined;
      if (!card || !card.isFaceUp()) return;
      const zone: CourtZone = world.getZoneById(
        `zone-court-${objects.court[0].getId()}-${i}`,
      )!;
      return { id: cardId(card), influence: zone.tallies! };
    })
    .filter((d) => !!d);
  const rules = world.getObjectById("rules") as CardHolder | undefined;

  const data: GameData = {
    campaign: !!rules,
    players: objects.board.map((board) => {
      const slot = board.getOwningPlayerSlot();
      const snaps = board.getAllSnapPoints();
      const resources = snaps
        .filter((s) => s.getTags().includes("resource"))
        .map((s) =>
          s.getSnappedObject()?.getTemplateName() === "resource"
            ? ((s.getSnappedObject() as Card).getCardDetails().name as Resource)
            : null,
        );
      const cities = snaps.filter(
        (s) =>
          s.getTags().includes("building") &&
          s.getSnappedObject()?.getTemplateName() === "city",
      ).length;
      const outrage = snaps
        .filter((s) => s.getTags().includes("agent"))
        .map((s, i) =>
          s.getSnappedObject()?.getTemplateName() === "agent"
            ? outragable[i]
            : null,
        )
        .filter((s) => s !== null);
      const guild =
        world
          .getZoneById(`zone-player-court-${board.getId()}`)
          ?.getOverlappingObjects()
          .filter(isGuild)
          .map(cardId) ?? [];
      const cards =
        (objects.cards as CardHolder[])
          .find((d) => d.getOwningPlayerSlot() === slot)
          ?.getCards()
          .map(cardId) ?? [];
      const zone =
        world
          .getZoneById(`zone-player-${board.getId()}`)
          ?.getOverlappingObjects() ?? [];
      const fate = cardId(
        zone.filter(
          (d): d is Card =>
            d.getTemplateName() === "fate" && !(d as Card).isInHolder(),
        )[0],
      );
      const titles =
        zone
          .filter(
            (d): d is Card =>
              d instanceof Card && d.getCardDetails().tags.includes("title"),
          )
          .map(cardId) ?? [];

      return {
        name: players
          .find((p) => p.getSlot() === board.getOwningPlayerSlot())
          ?.getName(),
        color: board.getPrimaryColor().toHex().slice(0, 6) as PlayerColor,
        initiative: board === hasInitiative,
        power: power[slot],
        resources,
        outrage,
        cities,
        spaceports: starports.filter((d) => d.getOwningPlayerSlot() === slot)
          .length,
        ships: ships.filter((d) => d.getOwningPlayerSlot() === slot).length,
        agents: agents.filter((d) => d.getOwningPlayerSlot() === slot).length,
        cards,
        guild,
        fate,
        objective: objective?.[slot],
        favors: [], // todo
        titles,
      };
    }),
    ambitions: [], // todo
    court,
    discard,
    edicts: rules
      ?.getCards()
      .filter((d) => d.getCardDetails().tags.includes("edict"))
      .map(cardId), // todo: policy disambiguation
    laws: rules
      ?.getCards()
      .filter((d) => d.getCardDetails().tags.includes("law"))
      .map(cardId),
  };
  console.log(JSON.stringify(data, null, 2));

  fetch("https://localhost:8080/postkey_ttpg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
