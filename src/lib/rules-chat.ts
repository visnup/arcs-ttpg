import { base, campaign } from "./pdfs";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function obfuscate(input: string, key: string) {
  return [...input]
    .map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length) % 8),
    )
    .join("");
}
const key = obfuscate(
  "rj,bhs,cun27)Pttjb^6EEHTmZCQJL@zDuS2bQJo5v=Ns@LHUqtL0w7BVdg^0RWMRB{eDk9C6?N1a4apwdT-sg,6_sseJURpqD@-`K|2lrBB",
  "AAQcNoA2-wzDdJZ6ScAmDg8GoUUEu3n30lroSTHA2qtNqiIiYIVd6ppoz0IwAbmw7-KkkliNTF1LgSt33NvX7Aacou_wFX3-30ipa-tna-ks",
);
const messages: Message[] = [];

export async function answerRulesQuestion(text: string) {
  messages.push({ role: "user", content: text });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 512,
      system: [
        {
          type: "text",
          text: `Base rulebook\n~~~\n${base}\n~~~`,
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text: `Campaign rulebook\n~~~\n${campaign}\n~~~`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  const reply = await response.json();
  messages.push({ role: "assistant", content: reply.content });

  return reply;
}

// (async function () {
//   console.log(await answerRulesQuestion("/rules how many systems are there?"));
// })();
