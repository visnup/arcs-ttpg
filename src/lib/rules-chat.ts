import { world, type Player } from "@tabletop-playground/api";
import { answerRulesQuestion } from "./ai";
import { captureException } from "./sentry";

// Answer rules questions with AI
const stalls = [
  "Consulting the Imperial Council...",
  "Calculating fleet movements...",
  "Gathering intelligence from the Court...",
  "Decoding messages from the Free States...",
  "Analyzing battle reports...",
  "Scanning the Reach...",
  "Reviewing Imperial edicts...",
  "Negotiating with the guilds...",
  "Studying ancient relics...",
  "Channeling psionic energy...",
  "Mapping strategic positions...",
  "Conferring with the Keepers...",
  "Monitoring fleet deployments...",
  "Searching the archives...",
];
function stall(message = "") {
  world.broadcastChatMessage(
    message || stalls[Math.floor(Math.random() * stalls.length)],
  );
}
let lastQuestion = 0;
export async function onChatMessage(player: Player, message: string) {
  if (message.startsWith("/rules ") || Date.now() - lastQuestion < 60e3) {
    const timeout = setTimeout(() => stall("..."), 1e3);
    const interval = setInterval(stall, 8e3);
    try {
      const reply = await answerRulesQuestion(message.replace(/^\/rules /, ""));
      world.broadcastChatMessage("\n" + reply.content[0].text);
      lastQuestion = Date.now();
    } catch (e) {
      world.broadcastChatMessage(`${e}`);
      captureException(new Error(e), { tags: { component: "rules-chat" } });
    } finally {
      clearTimeout(timeout);
      clearInterval(interval);
    }
  }
}
