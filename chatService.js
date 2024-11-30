const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: "sk-TaWUive6bWc8N1ighY4p6g03fAqU4OER78mdpRIoFDsladRK",
  baseURL: "https://api.moonshot.cn/v1",
});

// 定义联网功能
const tools = [
  {
    type: "builtin_function",
    function: {
      name: "$web_search",
    },
  },
];

let history = [
  {
    role: "system",
    content:
      "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。",
  },
];

function search_impl(arguments) {
  return arguments;
}

// 普通对话功能
async function normalChat(prompt) {
  try {
    //设置用户问题
    history.push({
      role: "user",
      content: prompt,
    });
    const completion = await client.chat.completions.create({
      model: "moonshot-v1-32k",
      messages: history,
    });

    const reply = completion.choices[0].message;
    history = history.concat(reply);

    // 如果回复中包含"我不知道"或类似表述，返回false表示需要联网搜索
    if (
      reply.content.includes("我不知道") ||
      reply.content.includes("截至我的知识更新日期") ||
      reply.content.includes("截至我最后更新的知识") ||
      reply.content.includes("我无法回答") ||
      reply.content.includes("抱歉，我没有相关信息")
    ) {
      return { success: false, message: "需要联网搜索" };
    }

    return { success: true, message: reply.content };
  } catch (error) {
    console.error("普通对话出错:", error.message);
    throw error;
  }
}

// 联网搜索功能
async function webSearchChat(prompt) {
  let finishReason = null;
  try {
    // console.log(prompt);
    while (finishReason === null || finishReason === "tool_calls") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const completion = await client.chat.completions
        .create({
          model: "moonshot-v1-auto",
          messages: prompt,
          temperature: 0.3,
          tools: tools,
        })
        .catch((error) => {
          if (error.status === 429) {
            console.log("达到速率限制，等待后重试...");
            return;
          }
          throw error;
        });

      const choice = completion.choices[0];
      finishReason = choice.finish_reason;

      if (finishReason === "tool_calls") {
        prompt.push(choice.message);
        for (const toolCall of choice.message.tool_calls) {
          const toolCallName = toolCall.function.name;
          const toolCallArguments = JSON.parse(toolCall.function.arguments);

          if (toolCallName == "$web_search") {
            console.log("执行联网功能...");
            toolResult = search_impl(toolCallArguments);
          } else {
            tool_result = "no tool found";
          }
          prompt.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCallName,
            content: JSON.stringify(toolResult),
          });
        }
      }

      if (finishReason === "stop") {
        return { success: true, message: choice.message.content };
      }
    }
  } catch (error) {
    console.error("联网搜索出错:", error.message);
    throw error;
  }
}

// 主要的聊天函数
async function chat(prompt) {
  try {
    // 首先尝试普通对话
    const normalResult = await normalChat(prompt);
    if (normalResult.success) {
      return normalResult.message;
    } else {
      //设置用户问题
      const historys = [
        {
          role: "system",
          content:
            "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。",
        },
        {
          role: "user",
          content: prompt,
        },
      ];
      // 如果普通对话无法回答，尝试联网搜索
      console.log("普通模型无法回答，切换到联网搜索...");
      const webResult = await webSearchChat(historys);
      return webResult.message;
    }
  } catch (error) {
    console.error("聊天过程出错:", error.message);
    throw error;
  }
}

module.exports = {
  chat,
  normalChat,
  webSearchChat,
};
