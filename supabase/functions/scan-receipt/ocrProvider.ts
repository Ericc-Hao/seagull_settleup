/// <reference path="../deno.d.ts" />

import { mapOpenAiHttpError, OcrProviderError } from './ocrErrors.ts';

export interface ExtractReceiptImageInput {
  imageBase64: string;
  mimeType?: string;
}

export interface ReceiptOcrResult {
  total: string | null;
  currency: string;
}

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

const RECEIPT_JSON_PROMPT =
  'You are reading a receipt. Extract the final total amount the customer paid. Return only JSON with this exact shape: {"total":"12.34","currency":"CAD"}. If no total is found, return {"total":null,"currency":"CAD"}.';

function stripJsonFence(value: string): string {
  return value
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function parseReceiptJson(content: string): ReceiptOcrResult {
  const stripped = stripJsonFence(content);
  let parsed: { total?: string | null; currency?: string | null };
  try {
    parsed = JSON.parse(stripped);
  } catch {
    console.error(
      JSON.stringify({
        event: 'openai_ocr_json_parse_failed',
        contentPreview: content.slice(0, 500),
      }),
    );
    throw new OcrProviderError('OPENAI_INVALID_RESPONSE', 'Could not parse OCR result.');
  }

  const total = parsed.total;
  const currency = typeof parsed.currency === 'string' && parsed.currency.trim()
    ? parsed.currency.trim().toUpperCase()
    : 'CAD';

  if (total === null || total === undefined || total === '') {
    return { total: null, currency };
  }

  if (typeof total !== 'string' && typeof total !== 'number') {
    throw new OcrProviderError('OPENAI_INVALID_RESPONSE', 'OpenAI returned an invalid OCR response.');
  }

  return { total: String(total), currency };
}

async function extractWithOpenAI(input: ExtractReceiptImageInput): Promise<ReceiptOcrResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  if (!apiKey) {
    console.warn(JSON.stringify({ event: 'openai_ocr_missing_api_key' }));
    throw new OcrProviderError('OCR_NOT_CONFIGURED', 'Receipt scanning is not configured yet.');
  }

  const model = (Deno.env.get('OPENAI_VISION_MODEL') ?? DEFAULT_MODEL).trim();
  const mimeType = input.mimeType?.trim() || 'image/jpeg';
  const imageBase64 = input.imageBase64.trim();
  const imageBytes = imageBase64.length;

  console.info(
    JSON.stringify({
      event: 'openai_ocr_request_started',
      model,
      mimeType,
      imageBytes,
      hasApiKey: Boolean(apiKey),
    }),
  );

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: RECEIPT_JSON_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 200,
    }),
  });

  console.info(
    JSON.stringify({
      event: 'openai_ocr_response_received',
      status: response.status,
      ok: response.ok,
    }),
  );

  if (!response.ok) {
    const errorText = await response.text();
    // OpenAI HTTP status hints (logged server-side only — not sent to clients):
    // 401 invalid key, 403 project access, 404 wrong endpoint/model,
    // 429 quota/rate limit, 400 bad payload/image, 500/502/503 provider issue.
    console.error(
      JSON.stringify({
        event: 'openai_ocr_response_error',
        status: response.status,
        bodyPreview: errorText.slice(0, 500),
      }),
    );
    const errorCode = mapOpenAiHttpError(response.status, errorText);
    throw new OcrProviderError(errorCode, `OpenAI OCR request failed (${response.status}).`, response.status);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    console.error(
      JSON.stringify({
        event: 'openai_ocr_missing_content',
        responsePreview: JSON.stringify(json).slice(0, 500),
      }),
    );
    throw new OcrProviderError('OPENAI_INVALID_RESPONSE', 'OpenAI returned an invalid OCR response.');
  }

  console.info(
    JSON.stringify({
      event: 'openai_ocr_content_received',
      contentPreview: content.slice(0, 300),
    }),
  );

  return parseReceiptJson(content);
}

export async function extractReceiptFromImage(input: ExtractReceiptImageInput): Promise<ReceiptOcrResult> {
  const provider = (Deno.env.get('RECEIPT_OCR_PROVIDER') ?? 'openai').toLowerCase();

  if (provider === 'openai') {
    return extractWithOpenAI(input);
  }

  console.warn(JSON.stringify({ event: 'openai_ocr_missing_api_key', reason: 'unsupported_provider' }));
  throw new OcrProviderError('OCR_NOT_CONFIGURED', 'Receipt scanning is not configured yet.');
}
