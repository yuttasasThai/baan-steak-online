import { Order, ShopSettings } from '../types';

/**
 * Service for sending Webhook and LINE Notify notifications for new orders
 */

export interface NotificationResult {
  success: boolean;
  message?: string;
  error?: string;
  status?: number;
}

/**
 * Formats a clean, readable Thai notification message for incoming orders
 */
export function formatOrderNotificationMessage(
  order: Partial<Order>,
  shopName: string = 'บ้าน สเต็กออนไลน์'
): string {
  const orderNum = order.orderNumber || (order.id ? order.id.slice(-6) : 'ใหม่');
  const deliveryType = order.deliveryType || 'ทานที่ร้าน';

  let tableInfo = '';
  if (order.tableNumber !== undefined && order.tableNumber !== null && String(order.tableNumber).trim() !== '') {
    tableInfo = ` (โต๊ะ ${order.tableNumber})`;
  }

  const customerName = order.customerName ? order.customerName.trim() : 'ลูกค้า';
  const customerPhone = order.customerPhone ? order.customerPhone.trim() : '-';
  const address = order.address ? order.address.trim() : '-';

  // Items list
  const itemsList = (order.items || [])
    .map((item, idx) => {
      const priceText = item.price ? ` (${item.price * item.quantity} บ.)` : '';
      return `${idx + 1}. ${item.name} x ${item.quantity}${priceText}`;
    })
    .join('\n');

  const totalAmount = typeof order.totalAmount === 'number' ? order.totalAmount : 0;
  const deliveryFee = typeof order.deliveryFee === 'number' ? order.deliveryFee : 0;
  const deliveryFeeText = deliveryFee > 0 ? ` (ค่าส่ง ${deliveryFee} บ.)` : '';

  // Thai formatted timestamp
  const now = new Date();
  const timeStr = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(now);

  const lines = [
    `\n🥩 [มีออเดอร์ใหม่เข้า!] ${shopName}`,
    `━━━━━━━━━━━━━━`,
    `📋 เลขที่: #${orderNum}`,
    `🍽️ รูปแบบ: ${deliveryType}${tableInfo}`,
    `👤 ลูกค้า: ${customerName}`,
    `📞 เบอร์โทร: ${customerPhone}`,
  ];

  if (deliveryType.includes('ส่ง') || (address && address !== '-' && !address.includes('โต๊ะ'))) {
    lines.push(`📍 จุดส่ง: ${address}`);
  }

  lines.push(`━━━━━━━━━━━━━━`);
  lines.push(`📝 รายการอาหาร (${(order.items || []).length} อย่าง):`);
  lines.push(itemsList || '- ไม่มีรายการ -');
  lines.push(`━━━━━━━━━━━━━━`);
  lines.push(`💵 ยอดรวม: ${totalAmount} บาท${deliveryFeeText}`);
  lines.push(`⏰ เวลาสั่ง: ${timeStr}`);

  return lines.join('\n');
}

/**
 * Sends a push message via LINE Official Account (Messaging API) using the backend proxy endpoint
 * This is the official replacement recommended by LINE Corporation after LINE Notify discontinuation.
 */
export async function sendLineOaPush(
  channelAccessToken: string,
  destinationId: string,
  message: string
): Promise<NotificationResult> {
  const cleanToken = channelAccessToken.trim();
  const cleanTo = destinationId.trim();

  if (!cleanToken) {
    return { success: false, error: 'กรุณาระบุ Channel Access Token ของ LINE Official Account' };
  }
  if (!cleanTo) {
    return { success: false, error: 'กรุณาระบุ Destination ID (User ID หรือ Group ID)' };
  }

  try {
    const res = await fetch('/api/notify/line-oa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelAccessToken: cleanToken,
        destinationId: cleanTo,
        message,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: 'ส่งแจ้งเตือนเข้า LINE Official Account สำเร็จ' };
    }

    return {
      success: false,
      error: data.error || `HTTP ${res.status}: ส่งแจ้งเตือน LINE OA ไม่สำเร็จ`,
      status: res.status,
    };
  } catch (err: unknown) {
    const errText = err instanceof Error ? err.message : String(err);
    console.warn('LINE OA proxy call failed:', errText);
    return { success: false, error: `ไม่สามารถส่งผ่าน LINE OA: ${errText}` };
  }
}

/**
 * Sends a notification message via LINE Notify Token using the backend proxy endpoint
 * Note: LINE Notify will be officially sunset on 31 March 2025.
 */
export async function sendLineNotify(
  token: string,
  message: string
): Promise<NotificationResult> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { success: false, error: 'ไม่พบ LINE Notify Token' };
  }

  try {
    const res = await fetch('/api/notify/line', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: cleanToken,
        message,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: 'ส่งแจ้งเตือนเข้า LINE Notify สำเร็จ' };
    }

    return {
      success: false,
      error: data.error || `HTTP ${res.status}: ส่งแจ้งเตือนไม่สำเร็จ`,
      status: res.status,
    };
  } catch (err: unknown) {
    const errText = err instanceof Error ? err.message : String(err);
    console.warn('LINE Notify proxy call failed:', errText);
    return { success: false, error: `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ส่งแจ้งเตือน: ${errText}` };
  }
}

/**
 * Sends a notification message via generic Webhook URL (Discord, Make, Zapier, n8n, Slack, etc.)
 */
export async function sendWebhook(
  webhookUrl: string,
  message: string,
  extraPayload?: Record<string, unknown>
): Promise<NotificationResult> {
  const cleanUrl = webhookUrl.trim();
  if (!cleanUrl) {
    return { success: false, error: 'ไม่พบ Webhook URL' };
  }

  try {
    const res = await fetch('/api/notify/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhookUrl: cleanUrl,
        message,
        payload: {
          content: message,
          text: message,
          message,
          timestamp: new Date().toISOString(),
          ...extraPayload,
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.success !== false)) {
      return { success: true, message: 'ส่งแจ้งเตือนผ่าน Webhook สำเร็จ' };
    }

    return {
      success: false,
      error: data.error || `HTTP ${res.status}: Webhook ส่งไม่สำเร็จ`,
      status: res.status,
    };
  } catch (err: unknown) {
    const errText = err instanceof Error ? err.message : String(err);
    console.warn('Webhook call failed:', errText);
    return { success: false, error: `ส่ง Webhook ไม่สำเร็จ: ${errText}` };
  }
}

/**
 * Triggers order notification based on ShopSettings:
 * Sends to LINE OA (Messaging API), Webhook URL, or legacy LINE Notify if configured.
 */
export async function sendOrderNotification(
  order: Partial<Order>,
  settings?: ShopSettings
): Promise<{
  lineOaResult?: NotificationResult;
  webhookResult?: NotificationResult;
  lineNotifyResult?: NotificationResult;
}> {
  if (!settings || !settings.lineNotifyEnabled) {
    return {};
  }

  const message = formatOrderNotificationMessage(order, settings.name || 'บ้าน สเต็กออนไลน์');
  const results: {
    lineOaResult?: NotificationResult;
    webhookResult?: NotificationResult;
    lineNotifyResult?: NotificationResult;
  } = {};

  // 1. Send via LINE Official Account (Messaging API - Official Primary)
  if (
    settings.lineChannelAccessToken &&
    settings.lineChannelAccessToken.trim() &&
    settings.lineDestinationId &&
    settings.lineDestinationId.trim()
  ) {
    try {
      results.lineOaResult = await sendLineOaPush(
        settings.lineChannelAccessToken,
        settings.lineDestinationId,
        message
      );
    } catch (err) {
      console.warn('Failed to send LINE OA push for order:', err);
    }
  }

  // 2. Send via Webhook URL (Discord, Make, Zapier, n8n, etc.)
  if (settings.webhookUrl && settings.webhookUrl.trim()) {
    try {
      results.webhookResult = await sendWebhook(settings.webhookUrl, message, {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
      });
    } catch (err) {
      console.warn('Failed to send Webhook for order:', err);
    }
  }

  // 3. Fallback: Send via legacy LINE Notify Token (if still valid before March 31, 2025)
  if (settings.lineNotifyToken && settings.lineNotifyToken.trim()) {
    try {
      results.lineNotifyResult = await sendLineNotify(settings.lineNotifyToken, message);
    } catch (err) {
      console.warn('Failed to send LINE Notify for order:', err);
    }
  }

  return results;
}

export interface TestNotificationParams {
  channelAccessToken?: string;
  destinationId?: string;
  webhookUrl?: string;
  lineNotifyToken?: string;
  shopName?: string;
}

/**
 * Sends a test notification to verify LINE OA, Webhook URL, or LINE Notify token
 */
export async function sendTestNotification({
  channelAccessToken,
  destinationId,
  webhookUrl,
  lineNotifyToken,
  shopName = 'บ้าน สเต็กออนไลน์',
}: TestNotificationParams): Promise<NotificationResult> {
  const hasLineOa = Boolean(
    channelAccessToken && channelAccessToken.trim() && destinationId && destinationId.trim()
  );
  const hasWebhook = Boolean(webhookUrl && webhookUrl.trim());
  const hasNotify = Boolean(lineNotifyToken && lineNotifyToken.trim());

  if (!hasLineOa && !hasWebhook && !hasNotify) {
    return {
      success: false,
      error: 'กรุณาระบุข้อมูล LINE OA (Token + ID), Webhook URL หรือ LINE Notify Token ก่อนกดทดสอบ',
    };
  }

  const testTime = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Bangkok',
  }).format(new Date());

  const testMessage = [
    `\n🔔 [ทดสอบระบบแจ้งเตือนออเดอร์]`,
    `━━━━━━━━━━━━━━`,
    `🏪 ร้าน: ${shopName}`,
    `✅ สถานะ: เชื่อมต่อบริการแจ้งเตือนสำเร็จ 100%!`,
    `⏰ เวลาทดสอบ: ${testTime}`,
    `━━━━━━━━━━━━━━`,
    `เมื่อมีลูกค้าสั่งอาหารใหม่เข้ามา ระบบจะส่งรายละเอียดออเดอร์มาที่นี่โดยอัตโนมัติทันทีครับ 🥩✨`,
  ].join('\n');

  const successes: string[] = [];
  const errors: string[] = [];

  // Test LINE OA Messaging API
  if (hasLineOa) {
    const res = await sendLineOaPush(channelAccessToken!, destinationId!, testMessage);
    if (res.success) {
      successes.push('LINE OA Messaging API สำเร็จ');
    } else {
      errors.push(`LINE OA: ${res.error || 'ผิดพลาด'}`);
    }
  }

  // Test Webhook
  if (hasWebhook) {
    const res = await sendWebhook(webhookUrl!, testMessage, { isTest: true });
    if (res.success) {
      successes.push('Webhook สำเร็จ');
    } else {
      errors.push(`Webhook: ${res.error || 'ผิดพลาด'}`);
    }
  }

  // Test Legacy LINE Notify
  if (hasNotify) {
    const res = await sendLineNotify(lineNotifyToken!, testMessage);
    if (res.success) {
      successes.push('LINE Notify สำเร็จ');
    } else {
      errors.push(`LINE Notify: ${res.error || 'ผิดพลาด'}`);
    }
  }

  if (successes.length > 0) {
    return {
      success: true,
      message: `✅ ${successes.join(' และ ')} เรียบร้อย! กรุณาตรวจสอบข้อความในแชท`,
    };
  }

  return {
    success: false,
    error: errors.join(' | ') || 'ส่งข้อความทดสอบไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า',
  };
}
