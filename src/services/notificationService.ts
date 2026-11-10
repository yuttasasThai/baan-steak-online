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
 * Sends a notification message via LINE Notify Token using the backend proxy endpoint
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
 * Sends to LINE Notify and/or Webhook URL if enabled.
 */
export async function sendOrderNotification(
  order: Partial<Order>,
  settings?: ShopSettings
): Promise<{
  lineResult?: NotificationResult;
  webhookResult?: NotificationResult;
}> {
  if (!settings || !settings.lineNotifyEnabled) {
    return {};
  }

  const message = formatOrderNotificationMessage(order, settings.name || 'บ้าน สเต็กออนไลน์');
  const results: { lineResult?: NotificationResult; webhookResult?: NotificationResult } = {};

  // 1. Send via LINE Notify Token
  if (settings.lineNotifyToken && settings.lineNotifyToken.trim()) {
    try {
      results.lineResult = await sendLineNotify(settings.lineNotifyToken, message);
    } catch (err) {
      console.warn('Failed to send LINE Notify for order:', err);
    }
  }

  // 2. Send via Webhook URL
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

  return results;
}

/**
 * Sends a test notification to verify LINE Notify token and Webhook URL
 */
export async function sendTestNotification(
  token?: string,
  webhookUrl?: string,
  shopName: string = 'บ้าน สเต็กออนไลน์'
): Promise<NotificationResult> {
  const hasToken = Boolean(token && token.trim());
  const hasWebhook = Boolean(webhookUrl && webhookUrl.trim());

  if (!hasToken && !hasWebhook) {
    return {
      success: false,
      error: 'กรุณาระบุ LINE Notify Token หรือ Webhook URL ก่อนกดทดสอบ',
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

  const errors: string[] = [];
  let isAnySuccess = false;

  if (hasToken) {
    const res = await sendLineNotify(token!, testMessage);
    if (res.success) {
      isAnySuccess = true;
    } else {
      errors.push(`LINE Notify: ${res.error || 'ผิดพลาด'}`);
    }
  }

  if (hasWebhook) {
    const res = await sendWebhook(webhookUrl!, testMessage, { isTest: true });
    if (res.success) {
      isAnySuccess = true;
    } else {
      errors.push(`Webhook: ${res.error || 'ผิดพลาด'}`);
    }
  }

  if (isAnySuccess) {
    return {
      success: true,
      message: `ส่งข้อความทดสอบสำเร็จเรียบร้อย! กรุณาตรวจสอบในแชท LINE หรือช่องทาง Webhook ของท่าน`,
    };
  }

  return {
    success: false,
    error: errors.join(' | ') || 'ส่งข้อความทดสอบไม่สำเร็จ กรุณาตรวจสอบ Token หรือ Webhook URL',
  };
}
