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
    let text = event.text.replace(/<@.*>/, "").trim();

    let prompt = ""
    if (text.startsWith("法白") || text.startsWith("法律白話文")) {
      text = text.replace(/法白|法律白話文/, "").trim()
      prompt = `'${text}' 對小學生用直白一句話解釋這條法律的意義:`
    } else if (text.startsWith("比較法條")) {
      if (!text.includes("old:") || !text.includes("new:")) {
        await sendMsg(
          client,
          context.botToken,
          event.channel,
          "比較法條 old:{舊條文} new:{新條文}"
        );
        return;
      }
      prompt = `old=舊法條 new=新法條 ${text} 100個中文字內解釋新舊條文之間的差異與改變意義:`
    } else {
      await sendMsg(
        client,
        context.botToken,
        event.channel,
        "法白 {法律案內文} 或 比較法條 old:{舊條文} new:{新條文}"
      );
      return;
    }

    const res = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 256,
      temperature: 0.6,
      top_p: 1,
      n: 1,
      stream: false,
      logprobs: null,
      stop: "",
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
  console.log('start');
  await app.start(process.env.PORT || 3000);
})();
