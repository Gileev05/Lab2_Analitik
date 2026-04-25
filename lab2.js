const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');

const INPUT_CSV = 'news.csv';
const OUTPUT_FILE = 'summary.txt';
const API_KEY = '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';

async function readFullCSVAsNews(filePath) {
    const rows = [];
    const stream = fs.createReadStream(filePath)
        .pipe(csv());

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

    return fullText || fs.readFileSync(filePath, 'utf8');
}

async function getSummary(text) {
    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'Ты помощник, который делает краткое содержание новостей. Ответь кратко, 2-3 предложения.'
                    },
                    {
                        role: 'user',
                        content: `Сделай краткое содержание этой новости (2-3 предложения):\n\n${text.substring(0, 3000)}`
                    }
                ],
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Ошибка API:', error.response?.data || error.message);
        return 'Не удалось создать пересказ';
    }
}

async function main() {
    const newsContent = await readFullCSVAsNews(INPUT_CSV);

    console.log(`Длина новости: ${newsContent.length} символов`);

    const summary = await getSummary(newsContent);

    const output = `КРАТКОЕ СОДЕРЖАНИЕ НОВОСТИ:\n${'='.repeat(60)}\n${summary}\n\n${'='.repeat(60)}`;

    fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
    console.log(`Результат сохранён в ${OUTPUT_FILE}`);
}

main().catch(console.error);