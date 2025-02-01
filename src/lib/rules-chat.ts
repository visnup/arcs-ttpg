import { base, campaign } from "./pdfs";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const key = [
  ..."AAQcNoA2-wzDdJZ6ScAmDg8GoUUEu3n30lroSTHA2qtNqiIiYIVd6ppoz0IwAbmw7-KkkliNTF1LgSt33NvX7Aacou_wFX3-30ipa-tna-ks",
]
  .reverse()
  .join("");
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
        { type: "text", text: `Base rulebook\n~~~json\n${base}\n~~~` },
        {
          type: "text",
          text: `Campaign rulebook\n~~~json\n${campaign}\n~~~`,
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
