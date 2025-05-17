import { world, type Player } from "@tabletop-playground/api";

export const meeples = new Map([
  ["5B24A477D74343B61EECDF8037563339", "31A3EA4DE94FFF0E93EED99845EB2566"], // agent
  ["7156FB49F4459B260FA4419F4BA433FA", "85263CC7784721BFA6D92B939192793D"], // flagship
  ["72DDA7161649E9CC16C6FB8C35FE5917", "74A1961EEB4DC5F7507377BA7B8C633A"], // imperial
  ["6E71A43CA74A0296800FC384CBBC6AC4", "37F294F4A746E47E28D85DB8EF8704FF"], // ship
]);
const miniatures = new Map([...meeples].map(([key, value]) => [value, key]));
export async function onChatMessage(player: Player, message: string) {
  const map = message.startsWith("/meeples")
    ? meeples
    : message.startsWith("/miniatures")
      ? miniatures
      : null;
  if (!map) return;

  for (const obj of world.getAllObjects()) {
    const m = map.get(obj.getTemplateId());
    if (m) {
      const p = obj.getPosition();
      const json = JSON.parse(obj.toJSONString());
      json.templateId = m;
      obj.destroy();
      world.createObjectFromJSON(JSON.stringify(json), p);
    }
  }
}
