import { Configuration, OpenAIApi } from "openai";
import bolt from "@slack/bolt";

const configuration = new Configuration({
  organization: process.env.OPENAI_ORG,
  apiKey: process.env.OPENAI_KEY,
});
const openai = new OpenAIApi(configuration);

const app = new bolt.App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.event("app_mention", async ({ event, client, context }) => {
  try {
    const text = event.text.replace(/<@.*>/, "").trim();
    if (!text.includes("old:") || !text.includes("new:")) {
      await sendMsg(
        client,
        context.botToken,
        event.channel,
        "old:{舊條文} new:{新條文}"
      );
      return;
    }

    const res = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `old=舊法條 new=新法條 ${text} 100個中文字內解釋新舊條文之間的差異與改變意義:`,
      max_tokens: 256,
      temperature: 0.5,
      top_p: 1,
      n: 1,
      stream: false,
      logprobs: null,
      stop: "Old",
    });

    await sendMsg(
      client,
      context.botToken,
      event.channel,
      res.data.choices[0].text
    );
  } catch (error) {
    await sendMsg(client, context.botToken, event.channel, "錯誤");
  }
});

async function sendMsg(client, token, channel, text) {
  try {
    await client.chat.postMessage({
      token,
      channel,
      text,
    });
  } catch (error) {
    console.error(error);
  }
}

(async () => {
  await app.start(process.env.PORT || 3000);
})();
