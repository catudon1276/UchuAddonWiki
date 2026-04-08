const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { category, name, text } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Content is required' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `以下の問い合わせ内容をチェックし、嫌がらせ、スパム、または著しく不適切な内容（暴力的、性的な表現など）が含まれている場合は「NG」とだけ返してください。問題がない場合は「OK」とだけ返してください。

カテゴリー: ${category}
送信者名: ${name}
内容: ${text}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const safetyCheck = response.text().trim();

        if (safetyCheck.includes("NG")) {
            return res.status(400).json({ error: '不適切な内容が含まれている可能性があるため、送信を中断しました。' });
        }

        // Discord へ送信
        const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
        if (DISCORD_WEBHOOK_URL) {
            const formattedContent = `[${category}] ${text}\nby ${name || '匿名'}`;
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'UchuAddon Antenna',
                    content: formattedContent,
                }),
            });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Gemini API Error:', error);

        if (error.message.includes('API key not valid')) {
            return res.status(500).json({ error: 'システム設定エラー（APIキーが無効です）' });
        }

        return res.status(500).json({ error: 'AIによる内容確認中にエラーが発生しました。' });
    }
};
