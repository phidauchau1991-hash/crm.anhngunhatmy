import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  AI_PROVIDER_DEFAULTS,
  normalizeProviderName,
  maskApiKey,
  formatProviderError,
  testAIProviderConnection,
} from '@/lib/aiHelper';

function hasAdminRole(request) {
  const roleStr = request.headers.get('x-user-role') || '';
  const roles = roleStr.split(',').map((r) => r.trim().toUpperCase());
  return roles.includes('DIRECTOR') || roles.includes('REGIONAL_MANAGER');
}

export async function GET(request) {
  try {
    if (!hasAdminRole(request)) {
      return NextResponse.json({ success: false, error: 'Chỉ Giám đốc / Quản lý mới được truy cập Cấu hình AI' }, { status: 403 });
    }

    const dbConfigs = await prisma.aiConfig.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    const firstActive = dbConfigs.find((c) => c.isActive);
    const primaryProvider = firstActive ? normalizeProviderName(firstActive.provider) : null;

    const providers = Object.entries(AI_PROVIDER_DEFAULTS).map(([key, meta]) => {
      const matched = dbConfigs.find((c) => normalizeProviderName(c.provider) === key);
      const dbKey = (matched?.apiKey || '').trim();
      const envKey = (process.env[meta.envKey] || '').trim();
      const effectiveHasKey = Boolean(dbKey || envKey);

      return {
        provider: key,
        label: meta.label,
        modelName: matched?.modelName || meta.defaultModel,
        defaultModel: meta.defaultModel,
        suggestedModels: meta.suggestedModels,
        isActive: matched ? Boolean(matched.isActive) : false,
        isPrimary: Boolean(matched?.isActive && primaryProvider === key),
        hasKey: Boolean(dbKey),
        maskedKey: dbKey ? maskApiKey(dbKey) : '',
        hasEnvFallback: Boolean(envKey),
        envVarName: meta.envKey,
        ready: Boolean((matched ? matched.isActive : Boolean(envKey)) && effectiveHasKey),
        updatedAt: matched?.updatedAt ? matched.updatedAt.toISOString() : null,
      };
    });

    return NextResponse.json({ success: true, data: providers });
  } catch (error) {
    console.error('Lỗi tải cấu hình AI:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!hasAdminRole(request)) {
      return NextResponse.json({ success: false, error: 'Chỉ Giám đốc / Quản lý mới được thay đổi Cấu hình AI' }, { status: 403 });
    }

    const body = await request.json();
    const { action = 'save', provider, apiKey, modelName, isActive, isPrimary, clearKey } = body;

    const norm = normalizeProviderName(provider);
    const meta = AI_PROVIDER_DEFAULTS[norm];
    if (!meta) {
      return NextResponse.json({ success: false, error: `Nhà cung cấp AI không hợp lệ: ${provider}` }, { status: 400 });
    }

    const existing = await prisma.aiConfig.findFirst({
      where: {
        provider: norm === 'openai' ? { in: ['openai', 'chatgpt'] } : norm,
      },
    });

    // Chế độ kiểm tra kết nối trực tiếp
    if (action === 'test') {
      const candidateKey =
        (apiKey && String(apiKey).trim()) ||
        (existing?.apiKey || '').trim() ||
        (process.env[meta.envKey] || '').trim();
      const candidateModel = (modelName && String(modelName).trim()) || existing?.modelName || meta.defaultModel;

      if (!candidateKey) {
        return NextResponse.json(
          { success: false, error: `${meta.label}: Chưa có API Key để kiểm tra. Vui lòng dán API Key trước.` },
          { status: 400 }
        );
      }

      try {
        const res = await testAIProviderConnection({
          provider: norm,
          apiKey: candidateKey,
          modelName: candidateModel,
        });
        return NextResponse.json({
          success: true,
          message: `${meta.label} (${candidateModel}) kết nối thành công trong ${res.latencyMs}ms!`,
          data: res,
        });
      } catch (err) {
        return NextResponse.json(
          { success: false, error: formatProviderError(norm, err) },
          { status: 400 }
        );
      }
    }

    // Lưu cấu hình provider
    const nextIsActive = isPrimary ? true : (isActive !== undefined ? Boolean(isActive) : (existing?.isActive ?? true));
    const nextModel = (modelName && String(modelName).trim()) || existing?.modelName || meta.defaultModel;
    const trimmedNewKey = apiKey !== undefined ? String(apiKey || '').trim() : '';

    const updatePayload = {
      provider: norm,
      modelName: nextModel,
      isActive: nextIsActive,
      ...(clearKey ? { apiKey: null } : trimmedNewKey ? { apiKey: trimmedNewKey } : {}),
    };

    // Xác định AI chính hiện tại trước khi lưu để giữ nguyên thứ tự ưu tiên nếu không chọn Đặt Chính
    const currentFirstActive = await prisma.aiConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    // Nếu đặt làm AI chính: lùi updatedAt của các cấu hình khác về trước để cấu hình này luôn có updatedAt mới nhất
    if (isPrimary) {
      const earlier = new Date(Date.now() - 5000);
      await prisma.$executeRaw`UPDATE AiConfig SET updatedAt = ${earlier.toISOString()} WHERE provider != ${existing?.provider || norm}`;
    }

    let saved;
    if (existing) {
      saved = await prisma.aiConfig.update({
        where: { id: existing.id },
        data: updatePayload,
      });
    } else {
      saved = await prisma.aiConfig.create({
        data: {
          provider: norm,
          modelName: nextModel,
          isActive: nextIsActive,
          apiKey: trimmedNewKey || null,
        },
      });
    }

    // Nếu không đặt làm AI chính và trước đó đã có AI chính khác -> giữ nguyên vị trí dẫn đầu cho AI chính cũ
    if (!isPrimary && currentFirstActive && currentFirstActive.id !== saved.id && currentFirstActive.isActive) {
      await prisma.aiConfig.update({
        where: { id: currentFirstActive.id },
        data: { updatedAt: new Date(Date.now() + 1000) },
      });
    }

    return NextResponse.json({
      success: true,
      message: isPrimary
        ? `Đã lưu & đặt ${meta.label} làm AI ưu tiên hàng đầu!`
        : `Đã lưu cấu hình ${meta.label} thành công!`,
      data: {
        provider: norm,
        modelName: saved.modelName,
        isActive: saved.isActive,
        hasKey: Boolean(saved.apiKey),
        maskedKey: saved.apiKey ? maskApiKey(saved.apiKey) : '',
      },
    });
  } catch (error) {
    console.error('Lỗi lưu cấu hình AI:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
