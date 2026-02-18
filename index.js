require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");

const app = express();
const port = process.env.PORT || 4000;

const config = {
  token: process.env.DISCORD_BOT_TOKEN,
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 星座對照表
const zodiacMap = {
  牡羊: "aries",
  金牛: "taurus",
  雙子: "gemini",
  巨蟹: "cancer",
  獅子: "leo",
  處女: "virgo",
  天秤: "libra",
  天蠍: "scorpio",
  射手: "sagittarius",
  摩羯: "capricorn",
  水瓶: "aquarius",
  雙魚: "pisces",
};

// 爬取運勢的函數
async function getHoroscope(zodiac) {
  try {
    const url = `https://www.elle.com/tw/starsigns/today/${zodiac}-today/`;

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    const fortunes = {
      todayDetails: [],
      overall: "",
      love: "",
      career: "",
      wealth: "",
    };

    // 今日重點
    $(".article-body-content ul:first li").each((index, element) => {
      fortunes.todayDetails.push("- " + $(element).text().trim());
    });

    // 各項運勢
    $("h2").each((index, element) => {
      const title = $(element).text().trim();
      const content = $(element).nextAll("p").first().text().trim();

      if (title === "整體運勢") fortunes.overall = content;
      if (title === "愛情運勢") fortunes.love = content;
      if (title === "事業運勢") fortunes.career = content;
      if (title === "財運運勢") fortunes.wealth = content;
    });

    // 若整體抓不到資料
    if (!fortunes.overall && fortunes.todayDetails.length === 0) {
      return "抱歉，運勢資料解析失敗，網站版面可能已變更。";
    }

    const todayDetailsText = fortunes.todayDetails.join("\n").trimEnd();

    return `
${todayDetailsText}
- 整體運勢：${fortunes.overall || "無資料"}
- 愛情運勢：${fortunes.love || "無資料"}
- 事業運勢：${fortunes.career || "無資料"}
- 財運運勢：${fortunes.wealth || "無資料"}`;
  } catch (error) {
    console.error("爬取運勢時發生錯誤：", error.message);

    // 連線逾時
    if (error.code === "ECONNABORTED") {
      return "抱歉，連接超時，請稍後再試。";
    }

    // HTTP 錯誤
    if (error.response) {
      const status = error.response.status;

      if (status === 404) {
        return "抱歉，目前找不到該星座的運勢頁面，網站可能已改版。";
      }

      if (status === 403) {
        return "抱歉，網站拒絕存取，可能已更改防爬機制。";
      }

      return `抱歉，網站回傳錯誤（${status}），暫時無法取得運勢。`;
    }

    return "抱歉，無法獲取運勢資訊，請稍後再試。";
  }
}

client.once("ready", () => {
  console.log(`已登入為 ${client.user.tag}`);
});

// 監聽訊息
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  for (const [zodiacCh, zodiacEn] of Object.entries(zodiacMap)) {
    if (message.content.includes(zodiacCh)) {
      try {
        const loadingMsg = await message.channel.send(
          `正在獲取${zodiacCh}座的運勢...`
        );

        const fortune = await getHoroscope(zodiacEn);

        await message.channel.send(`## ${zodiacCh}座今日運勢${fortune}`);

        await loadingMsg.delete();
        break;
      } catch (error) {
        console.error("處理運勢請求時發生錯誤：", error);
        message.channel.send("抱歉，獲取運勢時發生錯誤。");
      }
    }
  }
});

client.login(config.token);

// Web 伺服器（給 Render 或其他雲端用）
app.get("/", (req, res) => {
  res.send("Hello, Render!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
