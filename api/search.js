
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'POSTで送信してください。'
    });
  }

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: '検索APIキーがまだ設定されていません。'
    });
  }

  const query = String(req.body?.query || '').trim();

  if (!query || query.length > 200) {
    return res.status(400).json({
      error: '検索ワードを入力してください（200文字以内）。'
    });
  }

  try {
    const searchQueries = [
  `"${query}" C109 2026年12月 コミックマーケット109 サークル配置`,
  `"${query}" C109 2026冬コミ サークル参加 スペース番号`,
  `"${query}" コミケ109 お品書き 新刊 頒布物`,
  `"${query}" 冬コミ サークル C109 配置`,
  `"${query}" コミックマーケット109 サークル情報`
];

const responses = await Promise.all(
  searchQueries.map(searchQuery =>
    fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query: searchQuery,
        search_depth: 'advanced',
        max_results: 30,
start_date: '2026-11-06',
filter_by_published_date: true,
include_answer: false,
        include_domains: [
          'webcatalog.circle.ms',
          'x.com',
          'twitter.com'
        ]
      })
    })
  )
);

for (const response of responses) {
  if (!response.ok) {
    throw new Error('検索サービスでエラーが発生しました。');
  }
}

const searchData = await Promise.all(
  responses.map(response => response.json())
);

const combined = searchData.flatMap(item => item.results || []);

const unique = [
  ...new Map(
    combined
      .filter(item => item.url)
      .map(item => [item.url, item])
  ).values()
];

console.log('検索APIの結果:', unique);

const results = unique
  .map(item => {
    const text = `${item.title || ''} ${item.content || ''}`;
    const lower = text.toLowerCase();
    const normalizedText = lower.replace(/[\s　]/g, '');
const queryWords = query.toLowerCase()
  .split(/[\s　]+/)
  .filter(Boolean);

if (!queryWords.some(word =>
  normalizedText.includes(word.replace(/[\s　]/g, ''))
)) {
  return null;
}

    const excluded = [
      'コミックマーケット準備会',
      '@comiketofficial',
      'comic market committee',
      '@comiket_intl',
      'チケット',
      'tickets',
      'wristband',
      '入場案内',
      '参加申込書',
      '申込関連',
      '開催日程',
      'December 29-31',
      '入場時間',
      'リポスト',
      'repost',
      'rt @',
      '引用ポスト',
      '引用リポスト',
      'retweeted'
    ];

    if (excluded.some(word => lower.includes(word))) {
      return null;
    }

    const keywords = [
      'c109',
      '冬コミ',
      'コミケ',
      'サークル参加',
      'スペース',
      '配置',
      'お品書き',
      '新刊',
      '頒布',
      '同人誌',
      'グッズ'
    ];

    const score = keywords.reduce(
      (total, word) => total + (lower.includes(word) ? 1 : 0),
      0
    );

    if (score < 2) return null;

    const url = item.url || '';

    const xMatch = url.match(
      /(?:x\.com|twitter\.com)\/([^/?#]+)\/status\/\d+/i
    );

    return {
  title: item.title || 'タイトルなし',
  url,
  content: item.content || '',
  status: 'Webで発見・未確認',
  score,
  author: xMatch ? xMatch[1].toLowerCase() : null,
  publishedDate: item.published_date || null
};
  })
  .filter(Boolean)
  .sort((a, b) => b.score - a.score);

const usedAuthors = new Set();

const limitedResults = results.filter(item => {
  if (!item.author) return true;

  if (usedAuthors.has(item.author)) return false;

  usedAuthors.add(item.author);
  return true;
});

const finalResults = limitedResults.map(({ score, author, ...item }) => item);

return res.status(200).json({ results: finalResults });
  } catch (error) {
    return res.status(500).json({
  error: error.message || '検索に失敗しました。'
});
  }
}
