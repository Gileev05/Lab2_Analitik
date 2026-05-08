const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');

const API_KEY = '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';
const INPUT_CSV = 'news.csv';
const OUTPUT_FILE = 'summary.json';
const MODEL = 'baidu/cobuddy:free';

async function readFullCSVAsNews(filePath) {
    const rows = [];
    if (!fs.existsSync(filePath)) throw new Error(`Файл ${filePath} не найден!`);

    const stream = fs.createReadStream(filePath).pipe(csv());
    for await (const row of stream) {
        rows.push(row);
    }

    let fullText = '';
    rows.forEach((row, index) => {
        fullText += `Запись ${index + 1}:\n`;
        Object.entries(row).forEach(([key, value]) => {
            fullText += `${key}: ${value}\n`;
        });
        fullText += '\n';
    });
    return fullText;
}

async function getSummary(text) {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'Ты аналитик данных. Твой ответ должен содержать ТОЛЬКО валидный JSON. Не пиши пояснений. Структура: {"title": "заголовок", "summary": "описание", "key_points": ["факт1", "факт2", "факт3"]}'
                    },
                    {
                        role: 'user',
                        content: `Проанализируй эти новости и верни JSON:\n\n${text.substring(0, 5000)}`
                    }
                ],
                response_format: { "type": "json_object" }
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        let content = response.data.choices[0].message.content;

        content = content.replace(/^```json/g, '').replace(/```$/g, '').trim();

        try {
            return JSON.parse(content);
        } catch (e) {
            console.error('Не удалось распарсить JSON. Сырой ответ модели:', content);
            return { error: 'Ошибка формата', rawResponse: content };
        }
    } catch (error) {
        console.error('Ошибка API:', error.response?.data || error.message);
        return { error: 'Ошибка API' };
    }
}

async function main() {
    try {
        console.log('--- Начинаю чтение CSV ---');
        const newsContent = await readFullCSVAsNews(INPUT_CSV);
        console.log(`Прочитано ${newsContent.length} символов. Отправляю запрос...`);

        const summaryData = await getSummary(newsContent);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summaryData, null, 4), 'utf8');
        console.log('--- Готово! ---');
        console.log(`Результат сохранён в файл: ${OUTPUT_FILE}`);
    } catch (err) {
        console.error('Критическая ошибка:', err.message);
    }
}

main();