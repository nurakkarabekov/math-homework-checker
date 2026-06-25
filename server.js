import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" })); // фото в base64 — тяжёлые
app.use(express.static("public"));

app.post("/analyze", async (req, res) => {
  const { imageBase64, mediaType } = req.body;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemma-4-31b-it:free",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Проверь решение математической задачи на фото по шагам. Для каждого шага укажи статус correct/error и объясни ошибку. Ответь только JSON без markdown, по структуре: {\"problem\": \"...\", \"verdict\": \"correct\" или \"has_errors\", \"steps\": [{\"number\":1, \"text\":\"...\", \"status\":\"correct\"|\"error\", \"comment\":\"...\"}], \"summary\":\"...\"}" },
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } }
          ]
        }]
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Что-то пошло не так на сервере" });
  }
});

app.listen(3000, () => console.log("Сервер запущен: http://localhost:3000"));