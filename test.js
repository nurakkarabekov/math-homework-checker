import dotenv from "dotenv";
dotenv.config();

console.log("Ключ найден:", process.env.OPENROUTER_KEY ? "да ✅" : "нет ❌");