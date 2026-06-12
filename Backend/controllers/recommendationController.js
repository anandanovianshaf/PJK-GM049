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
        
        Rekomendasi tempat wisata beserta rating, tautan, dan ulasan riil pengunjung dari dataset:
        ${JSON.stringify(recommendations, null, 2)}
        
        Tugasmu:
        1. Jawab pertanyaan user dengan gaya bahasa yang ramah, santai, asyik, dan natural layaknya tour guide lokal Jawa Barat.
        2. Jelaskan mengapa tempat-tempat di atas cocok untuk mereka berdasarkan deskripsi dan data yang diberikan.
        3. Untuk SETIAP tempat wisata, kutip/sebutkan secara natural 1 atau 2 poin dari ulasan riil pengunjung yang ada di data "reviews" untuk meyakinkan pengguna (misal: "Kata pengunjung di sana...").
        4. Di akhir atau di dalam deskripsi masing-masing tempat wisata, buatlah tautan link eksplisit berformat markdown menggunakan properti "google_maps_url" (misal: "[Buka di Google Maps](google_maps_url)"). Jika ada website resmi, tampilkan juga link-nya.
        5. TIDAK BOLEH mengarang tempat wisata lain di luar daftar di atas.
        6. Jangan sebutkan kata "Sistem internal" atau sejenisnya, bertingkahlah seolah kamu secara personal merekomendasikan tempat ini kepada mereka.
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
