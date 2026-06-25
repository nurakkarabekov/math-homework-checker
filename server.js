import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" })); // фото в base64 — тяжёлые
app.use(express.static("public"));

async function callGemini(imageBase64, mediaType) {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GEMINI_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Проверь решение математической задачи на фото по шагам. ВАЖНО: весь текст внутри JSON (поля problem, text, comment, summary) пиши строго на русском языке, даже если задача или решение на фото на другом языке. Для каждого шага укажи статус correct/error и объясни ошибку. Ответь только JSON без markdown, по структуре: {\"problem\": \"...\", \"verdict\": \"correct\" или \"has_errors\", \"steps\": [{\"number\":1, \"text\":\"...\", \"status\":\"correct\"|\"error\", \"comment\":\"...\"}], \"summary\":\"...\"}. Напоминаю: ответ должен быть на русском языке." },
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } }
        ]
      }]
    })
  });
  return response.json();
}

function isOverloadedError(data) {
  const errorObj = data.error || (Array.isArray(data) && data[0] && data[0].error);
  return errorObj && (errorObj.code === 429 || errorObj.code === 503 || errorObj.status === "UNAVAILABLE");
}

app.post("/analyze", async (req, res) => {
  const { imageBase64, mediaType } = req.body;
  const MAX_ATTEMPTS = 3;

  try {
    let data = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      data = await callGemini(imageBase64, mediaType);

      if (!isOverloadedError(data)) break; // получилось или другая ошибка — выходим

      console.log(`Попытка ${attempt}: модель перегружена, жду 3 сек...`);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Что-то пошло не так на сервере" });
  }
});

app.listen(3000, () => console.log("Сервер запущен: http://localhost:3000"));