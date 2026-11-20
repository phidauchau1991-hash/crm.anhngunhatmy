import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import prisma from '@/lib/db';

export const AI_PROVIDER_DEFAULTS = {
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    envKey: 'GEMINI_API_KEY',
    suggestedModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  },
  deepseek: {
    label: 'DeepSeek AI',
    defaultModel: 'deepseek-chat',
    envKey: 'DEEPSEEK_API_KEY',
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
  openai: {
    label: 'OpenAI (ChatGPT)',
    defaultModel: 'gpt-4o-mini',
    envKey: 'OPENAI_API_KEY',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
  },
};

export function normalizeProviderName(raw) {
  const p = String(raw || '').trim().toLowerCase();
  if (p === 'chatgpt' || p === 'openai') return 'openai';
  if (p === 'deepseek') return 'deepseek';
  if (p === 'gemini' || p === 'google') return 'gemini';
  return p || 'gemini';
}

export function maskApiKey(key) {
  const s = String(key || '').trim();
  if (!s) return '';
  if (s.length <= 10) return `${s.slice(0, 2)}***${s.slice(-2)}`;
  return `${s.slice(0, 4)}••••••${s.slice(-4)}`;
}

export function formatProviderError(provider, error) {
  const label = AI_PROVIDER_DEFAULTS[normalizeProviderName(provider)]?.label || provider;
  const status = error?.status || error?.response?.status;
  const msg = String(error?.message || error || '');

  if (status === 402 || /insufficient\s*balance|quota.*exhaust|credit/i.test(msg)) {
    return `${label}: Tài khoản API đã hết số dư / hết hạn mức (HTTP 402).`;
  }
  if (status === 401 || status === 403 || /invalid.*api\s*key|unauthorized|authentication/i.test(msg)) {
    return `${label}: API Key không hợp lệ hoặc đã bị thu hồi (HTTP ${status || 401}).`;
  }
  if (status === 429 || /rate\s*limit|too many requests|resource_exhausted/i.test(msg)) {
    return `${label}: Đang quá giới hạn lượt gọi (HTTP 429).`;
  }
  if (status === 404 || /not\s*found|is not supported for generateContent/i.test(msg)) {
    return `${label}: Tên model không tồn tại hoặc đã ngừng hỗ trợ.`;
  }
  return `${label}: ${msg || 'Lỗi kết nối'}`;
}

export async function callSingleAIProvider({ provider, apiKey, modelName }, systemPrompt, userPrompt) {
  const norm = normalizeProviderName(provider);
  const meta = AI_PROVIDER_DEFAULTS[norm];
  if (!meta) {
    throw new Error(`Nhà cung cấp AI "${provider}" chưa được hỗ trợ.`);
  }

  const trimmedKey = String(apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error(`${meta.label}: Chưa cấu hình API Key.`);
  }

  const chosenModel = String(modelName || '').trim() || meta.defaultModel;

  if (norm === 'gemini') {
    const genAI = new GoogleGenerativeAI(trimmedKey);
    const model = genAI.getGenerativeModel({ model: chosenModel });
    const prompt = `${systemPrompt}\n\nYêu cầu người dùng:\n${userPrompt}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  if (norm === 'deepseek') {
    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: trimmedKey,
    });
    const response = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: chosenModel,
    });
    return response.choices?.[0]?.message?.content || '';
  }

  const openai = new OpenAI({ apiKey: trimmedKey });
  const response = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: chosenModel,
  });
  return response.choices?.[0]?.message?.content || '';
}

export async function testAIProviderConnection({ provider, apiKey, modelName }) {
  const started = Date.now();
  const reply = await callSingleAIProvider(
    { provider, apiKey, modelName },
    'Bạn là trợ lý kiểm tra kết nối hệ thống.',
    'Trả lời ngắn gọn đúng 2 từ: KẾT NỐI THÀNH CÔNG'
  );
  return {
    reply: String(reply || '').trim(),
    latencyMs: Date.now() - started,
  };
}

export async function generateAIResponse(systemPrompt, userPrompt) {
  const dbConfigs = await prisma.aiConfig.findMany({
    orderBy: { updatedAt: 'desc' },
  });

  const candidates = [];
  const disabledProviders = new Set(
    dbConfigs.filter((c) => !c.isActive).map((c) => normalizeProviderName(c.provider))
  );

  // 1. Ưu tiên các cấu hình AI đang bật trong DB (AI chính có updatedAt mới nhất -> đứng đầu)
  for (const cfg of dbConfigs) {
    if (!cfg.isActive) continue;
    const norm = normalizeProviderName(cfg.provider);
    const envVarName = AI_PROVIDER_DEFAULTS[norm]?.envKey;
    const resolvedKey = (cfg.apiKey || '').trim() || (envVarName ? (process.env[envVarName] || '').trim() : '');
    if (!resolvedKey) continue;

    // Tự động nâng cấp nếu DB còn lưu model cũ đã ngừng hỗ trợ
    let resolvedModel = (cfg.modelName || '').trim();
    if (norm === 'gemini' && resolvedModel === 'gemini-1.5-flash') {
      resolvedModel = AI_PROVIDER_DEFAULTS.gemini.defaultModel;
    }

    candidates.push({
      provider: norm,
      apiKey: resolvedKey,
      modelName: resolvedModel || AI_PROVIDER_DEFAULTS[norm]?.defaultModel,
    });
  }

  // 2. Fallback sang biến môi trường nếu chưa có trong DB và chưa bị tắt chủ động
  for (const [norm, meta] of Object.entries(AI_PROVIDER_DEFAULTS)) {
    if (disabledProviders.has(norm)) continue;
    if (candidates.some((c) => c.provider === norm)) continue;
    const envKey = (process.env[meta.envKey] || '').trim();
    if (envKey) {
      candidates.push({
        provider: norm,
        apiKey: envKey,
        modelName: meta.defaultModel,
      });
    }
  }

  if (candidates.length === 0) {
    throw new Error('Chưa có AI nào được kích hoạt và cấu hình API Key. Vui lòng vào Cấu hình -> Cấu hình AI để thiết lập.');
  }

  const errors = [];
  for (const candidate of candidates) {
    try {
      const text = await callSingleAIProvider(candidate, systemPrompt, userPrompt);
      if (text && String(text).trim()) {
        return text;
      }
      errors.push(`${AI_PROVIDER_DEFAULTS[candidate.provider]?.label || candidate.provider}: AI trả về nội dung rỗng.`);
    } catch (err) {
      const readableErr = formatProviderError(candidate.provider, err);
      console.error('[AI Fallback]', readableErr, err?.message || '');
      errors.push(readableErr);
    }
  }

  throw new Error(`Không thể kết nối AI (${errors.join(' | ')}). Vui lòng kiểm tra ở mục Cấu hình -> Cấu hình AI.`);
}
