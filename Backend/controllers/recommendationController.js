const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// Inisialisasi Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// URL AI Service Internal (bisa dioverride via docker-compose) http://127.0.0.1:8000
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

async function getJabarulinRecommendation(req, res) {
    try {
        const userPrompt = req.body.prompt; // Input dari user
        
        if (!userPrompt) {
            return res.status(400).json({ error: "Parameter 'prompt' wajib dikirimkan." });
        }

        console.log(`[AI-Lokal] Meminta rekomendasi untuk: "${userPrompt}"`);

        // 1. PANGGIL LOKAL AI (Python FastAPI buatan Dhaffa)
        const localAiResponse = await axios.post(`${AI_SERVICE_URL}/api/recommend`, {
            query: userPrompt,
            top_n: 3
        });
        
        const recommendations = localAiResponse.data.recommendations;
        const intent = localAiResponse.data.predicted_intent;

        // Jika AI lokal tidak menemukan data
        if (!recommendations || recommendations.length === 0) {
            return res.json({ 
                reply: "Maaf, Jabarulin belum bisa menemukan tempat yang cocok dengan deskripsi tersebut di Jawa Barat.",
                raw_data: []
            });
        }

        console.log(`[Gemini] Merakit prompt dan mengirim ke LLM...`);

        // 2. RAKIT PROMPT UNTUK GEMINI (Prompt Engineering)
        // Kita paksa Gemini HANYA menggunakan data dari AI Lokal untuk mencegah halusinasi
        const geminiPrompt = `
        Kamu adalah "Jabarulin", asisten cerdas rekomendasi wisata khusus di Jawa Barat.
        User bertanya: "${userPrompt}"
        
        Sistem internal kami telah mendeteksi intent pengguna adalah "${intent}" dan merekomendasikan tempat wisata berikut beserta ratingnya:
        ${JSON.stringify(recommendations, null, 2)}
        
        Tugasmu:
        Jawab pertanyaan user dengan gaya bahasa yang ramah, asyik, dan natural layaknya tour guide. 
        Jelaskan mengapa tempat-tempat di atas cocok untuk mereka berdasarkan data yang diberikan. 
        TIDAK BOLEH mengarang tempat wisata lain di luar daftar di atas.
        Jangan sebutkan kata "Sistem internal", bertingkahlah seolah kamu yang tahu tempat tersebut.
        `;

        // 3. PANGGIL GEMINI API
        const result = await model.generateContent(geminiPrompt);
        const geminiReply = result.response.text();

        console.log(`[Gemini] Respons berhasil didapatkan!`);

        // 4. KEMBALIKAN RESPONS KE FRONTEND
        res.json({
            status: "success",
            reply: geminiReply,
            raw_data: recommendations // Dikirim juga agar frontend bisa menampilkan map/foto
        });

    } catch (error) {
        console.error("Error di Recommendation Controller:", error.message);
        res.status(500).json({ error: "Terjadi kesalahan pada server backend/AI." });
    }
}

module.exports = { getJabarulinRecommendation };
