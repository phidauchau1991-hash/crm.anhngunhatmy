import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import prisma from '@/lib/db';

export async function generateAIResponse(systemPrompt, userPrompt) {
  try {
    // 1. Fetch active AI Config from Database
    const activeConfig = await prisma.aiConfig.findFirst({
      where: { isActive: true },
    });

    // 2. Default to Gemini using ENV if no active config found or API key is missing
    let provider = activeConfig?.provider?.toLowerCase() || 'gemini';
    let apiKey = activeConfig?.apiKey;
    let modelName = activeConfig?.modelName;

    // Fallback logic
    if (!apiKey) {
      if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
        apiKey = process.env.GEMINI_API_KEY;
        modelName = 'gemini-1.5-flash';
      } else {
        throw new Error('API Key không tồn tại cho cấu hình AI này.');
      }
    }

    // 3. Routing based on Provider
    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName || 'gemini-1.5-flash' });
      const prompt = `${systemPrompt}\n\nYêu cầu người dùng:\n${userPrompt}`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } 
    
    else if (provider === 'deepseek') {
      const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey,
      });
      const response = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: modelName || 'deepseek-chat',
      });
      return response.choices[0].message.content;
    }
    
    else if (provider === 'chatgpt' || provider === 'openai') {
      const openai = new OpenAI({
        apiKey: apiKey,
      });
      const response = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: modelName || 'gpt-4o-mini',
      });
      return response.choices[0].message.content;
    }

    throw new Error(`Provider ${provider} chưa được hỗ trợ.`);

  } catch (error) {
    console.error('Lỗi khi gọi AI Provider:', error);
    throw new Error('Không thể kết nối đến Trí tuệ nhân tạo. Vui lòng kiểm tra lại cấu hình.');
  }
}
