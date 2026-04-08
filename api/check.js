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

    // NGワードチェック
    const forbiddenWords = [
        // 性的表現
        "セックス", "sex", "えっち", "エッチ", "hentai", "ヘンタイ", "変態",
        "ちんこ", "まんこ", "ちんちん", "おちんちん", "チンポ", "おっぱい",
        "ポルノ", "porn", "nude", "エロ", "えろ", "アダルト",
        "fuck", "dick", "pussy", "ass", "bitch",
        // 暴言・誹謗中傷
        "死ね", "しね", "殺す", "ころす", "殺せ", "ころせ",
        "きもい", "キモい", "キモイ", "うざい", "ウザい", "ウザイ",
        "くず", "クズ", "ゴミ", "ごみ", "カス", "かす",
        "バカ", "ばか", "阿呆", "アホ", "あほ",
        "shit", "damn", "bastard", "crap",
        // スパム・荒らし
        "http://", "https://", "spam", "スパム",
        "広告", "宣伝", "副業", "稼げる", "儲かる", "お金",
        // 差別表現
        "差別", "ガイジ", "きちがい", "キチガイ",
    ];
    if (forbiddenWords.some(word => text.includes(word))) {
        return res.status(400).json({ error: '不適切な表現が含まれています。' });
    }

    try {
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
        console.error('Error:', error);
        return res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
};
