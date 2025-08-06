import {
  Card,
  world,
  type CardHolder,
  type GameObject,
} from "@tabletop-playground/api";
import { type CourtZone } from "../court";
import { type Ambition } from "../map-board";
import { type AmbitionZone } from "./ambition-section";

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
  court: CardId[];
  leader?: CardId;
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

const isCourt = (d: GameObject): d is Card =>
  d instanceof Card &&
  d.getStackSize() === 1 &&
  /^(bc|cc|lore|f\d+)$/.test(d.getTemplateName()) &&
  !d.getCardDetails().tags.includes("setup");
function cardId(d: undefined): undefined;
function cardId(d: Card): CardId;
function cardId(d: Card | undefined): CardId | undefined;
function cardId(d: Card | undefined) {
  if (!d) return undefined;
  const { index, name } = d.getCardDetails();
  const id = String(index + 1).padStart(2, "0");
  const template = d.getTemplateName();
  if (template === "dc") return `ARCS-AID${id}${d.isFaceUp() ? "A" : "B"}`;
  if (!d.isFaceUp()) return null;
  switch (d.getTemplateName()) {
    case "bc":
      return `ARCS-BC${id}`;
    case "cc":
      return `ARCS-CC${id}`;
    case "fate":
      return `ARCS-FATE${id}`;
    case "setup":
      return `ARCS-${Math.floor(index / 4) + 2}SETUP0${(index % 4) + 1}`;
    case "leader":
      return d.getTemplateId() === "E98E64EE1C419179627D158CFF565C59"
        ? `ARCS-LEAD${id}`
        : `ARCS-LEAD${String(index + 9).padStart(2, "0")}`;
    case "lore":
      return d.getTemplateId() === "13966E46F44AE8B1ADDB90A45D11FD01"
        ? `ARCS-LORE${id}`
        : `ARCS-LORE${String(index + 15).padStart(2, "0")}`;
    default: {
      const m = template.match(/^f0?(\d+)$/);
      if (m) return `ARCS-FATE${m[1]}${String(index + 1).padStart(2, "0")}`;
      return name.replace(/\n.*/s, "");
    }
  }
}

const declarable = ["tycoon", "tyrant", "warlord", "keeper", "empath"] as const;
const outragable = ["material", "fuel", "weapon", "relic", "psionic"] as const;
const track = world
  .getObjectById("map")!
  .getAllSnapPoints()
  .filter((p) => p.getTags().includes("power"))
  .map((p) => p.getGlobalPosition())
  .sort((a, b) => a.y - b.y);

let endpoint = "http://localhost:8080/postkey_ttpg?key=buddy";
let timeout: ReturnType<typeof setTimeout> | undefined;
export async function sync() {
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
  const discard = (objects.discard[0] as CardHolder)
    .getCards()
    .map<CardId>(cardId);
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
  const ambitions = world
    .getAllZones()
    .filter((z) => z.getId().startsWith("zone-ambition-"))
    .map((z) => {
      console.log(z.getId());
      console.log("z.getId()");
      const [, i] = z.getId().match(/^zone-ambition-(.*)$/)!;
      const id = declarable[+i] ?? i;
      const declared = z
        .getOverlappingObjects()
        .filter((d): d is Card => d.getTemplateName() === "ambition")
        .map((d) => +d.getCardDetails().metadata[d.isFaceUp() ? 2 : 0]);
      const { tallies } = z as AmbitionZone;
      players.map(p => console.log(p.getSlot()));
      const ranking = objects.board.map((board) => {
        const slot = board.getOwningPlayerSlot();
        const tallyEntry = [...tallies!].find(([i, v]) => i === slot);
        return tallyEntry ? tallyEntry[1] : 0;
      });
      console.log(ranking);
      return { id, declared, ranking };
    });
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
      const court =
        world
          .getZoneById(`zone-player-court-${board.getId()}`)
          ?.getOverlappingObjects()
          .filter(isCourt)
          .map<CardId>(cardId) ?? [];
      const cards =
        (objects.cards as CardHolder[])
          .find((d) => d.getOwningPlayerSlot() === slot)
          ?.getCards()
          .map<CardId>(cardId) ?? [];
      const zone =
        world
          .getZoneById(`zone-player-${board.getId()}`)
          ?.getOverlappingObjects() ?? [];
      const leader = zone.find(
        (d): d is Card =>
          d.getTemplateName() === "leader" && !(d as Card).isInHolder(),
      );
      const fate = zone.find(
        (d): d is Card =>
          d.getTemplateName() === "fate" && !(d as Card).isInHolder(),
      );
      const titles = zone
        .filter(
          (d): d is Card =>
            d instanceof Card && d.getCardDetails().tags.includes("title"),
        )
        .map<CardId>(cardId);
      const favors = fate
        ? world
            .boxTrace(
              fate.getPosition(),
              fate.getPosition().add([0, 0, 1]),
              fate.getExtent(false, false),
            )
            .map((h) => h.object)
            .filter((d) => d.getTemplateName() === "agent")
            .reduce((s, d) => (s[d.getOwningPlayerSlot()]++, s), [0, 0, 0, 0])
        : undefined;

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
        court,
        leader: cardId(leader),
        fate: cardId(fate),
        objective: objective?.[slot],
        favors,
        titles,
      };
    }),
    ambitions,
    court,
    discard,
    edicts: rules
      ?.getCards()
      .filter((d) => d.getCardDetails().tags.includes("edict"))
      .map<CardId>(cardId),
    laws: rules
      ?.getCards()
      .filter((d) => d.getCardDetails().tags.includes("law"))
      .map<CardId>(cardId),
  };
  // console.log(JSON.stringify(data, null, 2));

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    // console.log(res.status);
  } catch (e) {
    console.error(e);
  }

  timeout = setTimeout(() => sync(), 5000);
}

export function stopSync() {
  clearTimeout(timeout);
  timeout = undefined;
}

export async function onChatMessage(player: unknown, message: string) {
  if (!message.startsWith("/sync")) return;
  const url = message.split(/\s+/)[1]?.trim();
  if (url === "stop") return stopSync();
  if (url) endpoint = url;
  await sync();
}
