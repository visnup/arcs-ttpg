import {
  Card,
  world,
  type CardHolder,
  type GameObject,
} from "@tabletop-playground/api";
import { type Ambition } from "../map-board";

type GameData = {
  campaign: boolean;
  players: PlayerData[];
  ambitions: AmbitionData[];
  court: CourtData[];
  discard: ActionCard[];
  // campaign
  edicts?: string[];
  laws?: string[];
};
type ActionCard = string; // "1 Construction"
type PlayerColor = "FFB700" | "0095A9" | "E1533D" | "D7D2CB"; // | "912AAD";
type PlayerRank = number[]; // [2, 1, 7, 8] = yellow=2, blue=1, red=7, white=8
type PlayerData = {
  name?: string; // board can be present without player
  color: PlayerColor;
  initiative: boolean;
  power: number;
  resources: (string | null)[];
  outrage: string[];
  cities: number;
  spaceports: number;
  ships: number;
  agents: number;
  cards: ActionCard[];
  guild: string[];
  // campaign
  fate?: string;
  objective?: number;
  favors?: PlayerRank;
  titles?: string[];
};
type AmbitionData = {
  name: Ambition;
  declared: number[];
  ranking: PlayerRank;
};
type CourtData = {
  name: string;
  agents: PlayerRank;
  // todo: attached
};

const isGuild = (d: GameObject): d is Card =>
  d instanceof Card && /^(bc|cc|lore|f\d+)$/.test(d.getTemplateName());
const cardName = (d: Card) => d.getCardDetails().name.replace(/\n.*/s, "");
const outragable = ["material", "fuel", "weapon", "relic", "psionic"];
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
            ? (s.getSnappedObject() as Card).getCardDetails().name
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
          .map(cardName) ?? [];
      const cards =
        (objects.cards as CardHolder[])
          .find((d) => d.getOwningPlayerSlot() === slot)
          ?.getCards()
          .map(cardName) ?? [];

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
        fate: undefined, // todo
        objective: objective?.[slot],
        favors: [], // todo
        titles: [], // todo
      };
    }),
    ambitions: [], // todo
    court: [], // todo
    discard: [], // todo
    edicts: rules
      ?.getCards()
      .filter((d) => d.getCardDetails().tags.includes("edict"))
      .map(cardName), // todo: policy disambiguation
    laws: rules
      ?.getCards()
      .filter((d) => d.getCardDetails().tags.includes("law"))
      .map(cardName),
  };
  console.log(JSON.stringify(data, null, 2));

  fetch("https://localhost:8080/postkey_ttpg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
