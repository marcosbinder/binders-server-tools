/**
 * @file ocrService.js
 * @description Optical Character Recognition service utilizing OCR.space API with resilient fallback and timeout controls
 */

const OCR_DEFAULT_ENDPOINT = 'https://api.ocr.space/parse/image';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Extracts text from an image URL using OCR API
 * 
 * @param {string} imageUrl The publicly accessible URL of the image
 * @param {object} [options]
 * @param {string} [options.language='por'] 'por' for Portuguese, 'eng' for English
 * @param {string} [options.apiKey] Optional custom OCR.space API key
 * @param {number} [options.timeoutMs=10000] Timeout in milliseconds
 * @param {typeof fetch} [fetchFn] Injectable fetch for testing
 * @returns {Promise<{ success: boolean, text: string, characters: number, lines: number, error?: string, provider: string }>}
 */
async function extractTextFromImage(imageUrl, options = {}, fetchFn = globalThis.fetch) {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return {
            success: false,
            text: '',
            characters: 0,
            lines: 0,
            error: 'Nenhuma URL de imagem válida foi fornecida.',
            provider: 'OCR Engine',
        };
    }

    const language = options.language === 'en' || options.language === 'eng' ? 'eng' : 'por';
    const apiKey = options.apiKey || process.env.OCR_API_KEY || 'helloworld';
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const params = new URLSearchParams();
        params.append('url', imageUrl);
        params.append('language', language);
        params.append('isOverlayRequired', 'false');
        params.append('detectOrientation', 'true');
        params.append('scale', 'true');

        const response = await fetchFn(OCR_DEFAULT_ENDPOINT, {
            method: 'POST',
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
            signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
            return {
                success: false,
                text: '',
                characters: 0,
                lines: 0,
                error: `HTTP ${response.status}: Falha na comunicação com o provedor OCR.`,
                provider: 'OCR.space',
            };
        }

        const data = await response.json();

        if (data.IsErroredOnProcessing) {
            const errorDetail = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(', ') : (data.ErrorMessage || 'Erro no processamento da imagem');
            return {
                success: false,
                text: '',
                characters: 0,
                lines: 0,
                error: errorDetail,
                provider: 'OCR.space',
            };
        }

        const parsedResult = data.ParsedResults && data.ParsedResults[0];
        const rawText = parsedResult?.ParsedText ? parsedResult.ParsedText.trim() : '';

        const lines = rawText ? rawText.split(/\r?\n/).filter(l => l.trim().length > 0).length : 0;
        const characters = rawText.length;

        return {
            success: true,
            text: rawText,
            characters,
            lines,
            provider: 'OCR.space',
        };
    } catch (err) {
        clearTimeout(timer);
        const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
        return {
            success: false,
            text: '',
            characters: 0,
            lines: 0,
            error: isAbort ? 'Tempo limite esgotado ao analisar imagem.' : (err.message || 'Erro inesperado no OCR'),
            provider: 'OCR.space',
        };
    }
}

module.exports = {
    extractTextFromImage,
    OCR_DEFAULT_ENDPOINT,
};
