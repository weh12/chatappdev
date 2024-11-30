const { chat } = require("./chatService");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

//开放3000端口
const app = express();
const port = 3002;

// 使用 CORS 中间件
app.use(
  cors({
    origin: "http://localhost:3000", // 允许的前端域名
    methods: ["GET", "POST"],
    credentials: true, // 如果需要支持凭据
  })
);

// 使用中间件解析 JSON
app.use(bodyParser.json());

// 定义聊天接口
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "请提供聊天内容",
      });
    }

    const reply = await chat(message);
    // const replyre = JSON.stringify(reply);
    // console.log(reply);
    res.json({
      success: true,
      message: reply,
    });
  } catch (error) {
    console.error("服务器错误:", error.message);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
