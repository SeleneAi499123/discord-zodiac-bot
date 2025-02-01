require('dotenv').config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");
const express = require('express')

const app = express()
const port = process.env.PORT || 4000;

const config = {
    token: process.env.DISCORD_BOT_TOKEN
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

    // 建立運勢對象來存儲各類運勢
    const fortunes = {
      todayDetails: [], // 存儲今日運勢的所有細節
      overall: "", // 整體運勢
      love: "", // 愛情運勢
      career: "", // 事業運勢
      wealth: "", // 財運運勢
    };

    // 只獲取第一個 ul 中的所有 li 元素
    $(".article-body-content ul:first li").each((index, element) => {
      fortunes.todayDetails.push("- " + $(element).text().trim());
    });

    // 修改這部分，選取每個 h2 後的第一个 p 元素
    $("h2").each((index, element) => {
      const title = $(element).text().trim();
      const content = $(element).nextAll("p").first().text().trim(); // 改為 .nextAll("p").first() 獲取 h2 後的第一個 p

      // console.log(`Title: ${title}, Content: ${content}`); // 調試輸出

      if (title === "整體運勢") fortunes.overall = content;
      if (title === "愛情運勢") fortunes.love = content;
      if (title === "事業運勢") fortunes.career = content;
      if (title === "財運運勢") fortunes.wealth = content;
    });

    // 格式化輸出文字
    const todayDetailsText = fortunes.todayDetails.join("\n").trimEnd();

    return `
${todayDetailsText}
- 整體運勢：${fortunes.overall || "無資料"}
- 愛情運勢：${fortunes.love || "無資料"}
- 事業運勢：${fortunes.career || "無資料"}
- 財運運勢：${fortunes.wealth || "無資料"}`;
  } catch (error) {
    console.error("爬取運勢時發生錯誤：", error.message);
    if (error.code === "ECONNABORTED") {
      return "抱歉，連接超時，請稍後再試。";
    }
    return "抱歉，無法獲取運勢信息。";
  }
}

client.once("ready", () => {
  console.log(`已登入為 ${client.user.tag}`);
});

// 監聽消息
client.on("messageCreate", async (message) => {
  // 如果是機器人發送的消息則忽略
  if (message.author.bot) return;

  // 檢查消息中是否包含任何星座名稱
  for (const [zodiacCh, zodiacEn] of Object.entries(zodiacMap)) {
    if (message.content.includes(zodiacCh)) {
      try {
        // 顯示正在獲取運勢的提示
        const loadingMsg = await message.channel.send(
          `正在獲取${zodiacCh}座的運勢...`
        );

        // 獲取運勢
        const fortune = await getHoroscope(zodiacEn);

        // 發送運勢信息
        await message.channel.send(`## ${zodiacCh}座今日運勢${fortune}`);

        // 刪除載入提示
        await loadingMsg.delete();

        break; // 找到一個星座後就跳出循環
      } catch (error) {
        console.error("處理運勢請求時發生錯誤：", error);
        message.channel.send("抱歉，獲取運勢時發生錯誤。");
      }
    }
    // else {
    //   await message.channel.send(`別吵我，我正在思考人生。`);
    //   break;
    // }
  }
});

client.login(config.token);

app.get("/", (req, res) => {
  res.send("Hello, Render!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});