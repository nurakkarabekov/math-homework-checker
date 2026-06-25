const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const checkBtn = document.getElementById("checkBtn");
const loading = document.getElementById("loading");
const results = document.getElementById("results");

let base64Image = null;
let mediaType = null;

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  mediaType = file.type;
  const reader = new FileReader();

  reader.onload = () => {
    base64Image = reader.result.split(",")[1]; // убираем "data:image/png;base64,"
    preview.src = reader.result;
    preview.style.display = "block";
    checkBtn.style.display = "inline-block";
    results.innerHTML = "";
  };

  reader.readAsDataURL(file);
});

checkBtn.addEventListener("click", async () => {
  loading.style.display = "block";
  results.innerHTML = "";
  checkBtn.disabled = true;

  try {
    const response = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64Image, mediaType })
    });

    const data = await response.json();
    console.log("Ответ сервера:", data); // пригодится для отладки

    if (data.error) {
      throw new Error(
        data.error.code === 429
          ? "Сервис сейчас перегружен (бесплатный лимит). Подожди минуту и попробуй снова."
          : "Сервер ИИ ответил ошибкой: " + data.error.message
      );
    }

    const rawText = data.choices[0].message.content;
    const cleanText = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    renderResults(parsed);
  } catch (err) {
    console.error(err);
    results.innerHTML = `<p>⚠️ ${err.message}</p>`;
  } finally {
    loading.style.display = "none";
    checkBtn.disabled = false;
  }
});

function renderResults(data) {
  let html = `<h3>Задача: ${data.problem}</h3>`;
  data.steps.forEach(step => {
    html += `
      <div class="step ${step.status}">
        <b>Шаг ${step.number}:</b> ${step.text}
        ${step.comment ? `<p>${step.comment}</p>` : ""}
      </div>
    `;
  });
  html += `<p><b>Итог:</b> ${data.summary}</p>`;
  results.innerHTML = html;
}