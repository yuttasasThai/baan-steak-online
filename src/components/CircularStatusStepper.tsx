import React from 'react';
import {
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Truck,
  Utensils,
  Wallet,
} from 'lucide-react';
import { Order, OrderItemStatus, OrderStatus } from '../types';
import { getOrderCompletionSummary, normalizeOrderStatus } from '../services/menuService';

export interface CircularStepDef {
  status: OrderStatus;
  shortLabel: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  activeRing: string;
  activeBg: string;
  doneBg: string;
  textColor: string;
}

export const ORDER_CIRCULAR_STEPS: CircularStepDef[] = [
  {
    status: 'รับออเดอร์',
    shortLabel: 'รับ',
    label: 'รับออเดอร์',
    Icon: Bell,
    activeRing: 'ring-amber-300',
    activeBg: 'bg-amber-400 text-stone-950',
    doneBg: 'bg-emerald-500 text-white',
    textColor: 'text-amber-800',
  },
  {
    status: 'กำลังทำ',
    shortLabel: 'ทำ',
    label: 'กำลังทำ',
    Icon: Flame,
    activeRing: 'ring-blue-300',
    activeBg: 'bg-blue-600 text-white',
    doneBg: 'bg-emerald-500 text-white',
    textColor: 'text-blue-700',
  },
  {
    status: 'ส่งออเดอร์',
    shortLabel: 'ส่ง',
    label: 'ส่งออเดอร์',
    Icon: Truck,
    activeRing: 'ring-orange-300',
    activeBg: 'bg-orange-500 text-white',
    doneBg: 'bg-emerald-500 text-white',
    textColor: 'text-orange-700',
  },
  {
    status: 'ส่งแล้ว',
    shortLabel: 'เสร็จ',
    label: 'ส่งแล้ว',
    Icon: CheckCircle2,
    activeRing: 'ring-emerald-300',
    activeBg: 'bg-emerald-600 text-white',
    doneBg: 'bg-emerald-600 text-white',
    textColor: 'text-emerald-700',
  },
];

export const ITEM_STATUS_CIRCLES: Array<{
  status: OrderItemStatus;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
  idleClass: string;
}> = [
  {
    status: 'รอทำ',
    label: 'รอทำ',
    shortLabel: 'รอ',
    Icon: Clock,
    activeClass: 'bg-amber-400 text-stone-950 border-amber-500 ring-2 ring-amber-200 shadow-xs',
    idleClass: 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-amber-50 hover:text-amber-800',
  },
  {
    status: 'กำลังทำ',
    label: 'กำลังทำ',
    shortLabel: 'ทำ',
    Icon: Flame,
    activeClass: 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-200 shadow-xs',
    idleClass: 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-blue-50 hover:text-blue-700',
  },
  {
    status: 'พร้อมเสิร์ฟ',
    label: 'พร้อมเสิร์ฟ',
    shortLabel: 'พร้อม',
    Icon: Utensils,
    activeClass: 'bg-orange-500 text-white border-orange-600 ring-2 ring-orange-200 shadow-xs',
    idleClass: 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-orange-50 hover:text-orange-700',
  },
  {
    status: 'เสิร์ฟแล้ว',
    label: 'ได้รับครบแล้ว',
    shortLabel: 'ครบแล้ว',
    Icon: Check,
    activeClass: 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-200 shadow-xs',
    idleClass: 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-emerald-50 hover:text-emerald-700',
  },
];

function getStepIndex(status: OrderStatus): number {
  const norm = normalizeOrderStatus(status);
  if (norm === 'รับออเดอร์') return 0;
  if (norm === 'กำลังทำ') return 1;
  if (norm === 'ส่งออเดอร์' || norm === 'กำลังส่ง') return 2;
  if (norm === 'ส่งแล้ว') return 3;
  if (norm === 'เช็คบิล') return 4;
  return -1;
}

interface CircularStatusStepperProps {
  currentStatus: OrderStatus;
  compact?: boolean;
  interactive?: boolean;
  disabled?: boolean;
  onSelectStep?: (targetStatus: OrderStatus) => void;
  onOpenModal?: () => void;
  showCheckoutCircle?: boolean;
  onSelectCheckout?: () => void;
}

export const CircularStatusStepper: React.FC<CircularStatusStepperProps> = ({
  currentStatus,
  compact = false,
  interactive = false,
  disabled = false,
  onSelectStep,
  onOpenModal,
  showCheckoutCircle = false,
  onSelectCheckout,
}) => {
  const normStatus = normalizeOrderStatus(currentStatus);
  const activeIdx = getStepIndex(normStatus);

  if (compact) {
    const WrapperTag = onOpenModal ? 'button' : 'div';
    return (
      <WrapperTag
        {...(onOpenModal ? { type: 'button' as const, onClick: onOpenModal } : {})}
        className={`inline-flex items-center gap-1 p-1.5 rounded-2xl bg-stone-50 border border-stone-200/90 ${
          onOpenModal
            ? 'hover:border-red-300 hover:bg-red-50/40 active:scale-[0.98] transition cursor-pointer shadow-2xs'
            : ''
        }`}
        title={onOpenModal ? 'แตะเพื่อเปิดหน้าต่างอัปเดตสถานะออเดอร์ & รายการอาหาร' : undefined}
      >
        {ORDER_CIRCULAR_STEPS.map((step, idx) => {
          const isCompleted = activeIdx > idx;
          const isCurrent = activeIdx === idx;
          const Icon = isCompleted ? Check : step.Icon;

          return (
            <React.Fragment key={step.status}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                    isCurrent
                      ? `${step.activeBg} border-transparent ring-2 ${step.activeRing} shadow-xs scale-105`
                      : isCompleted
                      ? `${step.doneBg} border-transparent shadow-2xs`
                      : 'bg-white text-stone-300 border-stone-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              {idx < ORDER_CIRCULAR_STEPS.length - 1 && (
                <div
                  className={`w-2.5 h-0.5 rounded-full ${
                    activeIdx > idx ? 'bg-emerald-400' : 'bg-stone-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </WrapperTag>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-1">
        {ORDER_CIRCULAR_STEPS.map((step, idx) => {
          const isCompleted = activeIdx > idx;
          const isCurrent = activeIdx === idx;
          const isNextForward = idx > activeIdx && activeIdx >= 0 && normStatus !== 'เช็คบิล' && normStatus !== 'ยกเลิก';
          const canClick = Boolean(interactive && onSelectStep && isNextForward && !disabled);
          const Icon = isCompleted ? Check : step.Icon;

          return (
            <React.Fragment key={step.status}>
              <button
                type="button"
                disabled={!canClick}
                onClick={() => canClick && onSelectStep?.(step.status)}
                className={`flex flex-col items-center gap-1.5 flex-1 min-w-0 group ${
                  canClick ? 'cursor-pointer' : 'cursor-default'
                }`}
                title={
                  canClick
                    ? `แตะเพื่อเปลี่ยนสถานะเป็น "${step.label}"`
                    : isCurrent
                    ? `สถานะปัจจุบัน: ${step.label}`
                    : step.label
                }
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCurrent
                      ? `${step.activeBg} border-transparent ring-4 ${step.activeRing} shadow-md scale-105`
                      : isCompleted
                      ? `${step.doneBg} border-emerald-500 shadow-xs`
                      : canClick
                      ? 'bg-white text-stone-600 border-stone-300 hover:border-red-500 hover:bg-red-50 hover:text-red-600 active:scale-95 shadow-2xs'
                      : 'bg-stone-100 text-stone-400 border-stone-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[11px] font-bold text-center leading-tight px-0.5 ${
                    isCurrent
                      ? 'text-stone-900 font-black'
                      : isCompleted
                      ? 'text-emerald-700'
                      : canClick
                      ? 'text-stone-700 group-hover:text-red-600'
                      : 'text-stone-400'
                  }`}
                >
                  {step.label}
                </span>
              </button>

              {idx < ORDER_CIRCULAR_STEPS.length - 1 && (
                <div className="pt-5 sm:pt-5.5 flex-1 max-w-[32px]">
                  <div
                    className={`h-1 w-full rounded-full transition-colors ${
                      activeIdx > idx ? 'bg-emerald-500' : 'bg-stone-200'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}

        {showCheckoutCircle && (
          <>
            <div className="pt-5 sm:pt-5.5 flex-1 max-w-[32px]">
              <div
                className={`h-1 w-full rounded-full transition-colors ${
                  normStatus === 'เช็คบิล' ? 'bg-teal-500' : 'bg-stone-200'
                }`}
              />
            </div>
            <button
              type="button"
              disabled={disabled || normStatus === 'เช็คบิล' || normStatus === 'ยกเลิก'}
              onClick={() => onSelectCheckout?.()}
              className="flex flex-col items-center gap-1.5 flex-1 min-w-0 group cursor-pointer disabled:cursor-default"
              title="เปิดหน้าต่างสรุปรายการและเช็คบิล"
            >
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  normStatus === 'เช็คบิล'
                    ? 'bg-teal-600 text-white border-teal-700 ring-4 ring-teal-200 shadow-md'
                    : 'bg-teal-50 text-teal-700 border-teal-400 hover:bg-teal-600 hover:text-white active:scale-95 shadow-2xs'
                }`}
              >
                <Wallet className="w-5 h-5" />
              </div>
              <span
                className={`text-[11px] font-black text-center leading-tight ${
                  normStatus === 'เช็คบิล' ? 'text-teal-800' : 'text-teal-700'
                }`}
              >
                เช็คบิล
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export const OrderCompletionBadge: React.FC<{ order: Order; onClick?: () => void }> = ({
  order,
  onClick,
}) => {
  const summary = getOrderCompletionSummary(order);
  if (summary.totalLines === 0) return null;

  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${
        summary.isAllCompleted
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
          : 'bg-amber-50 text-amber-900 border-amber-300'
      } ${onClick ? 'cursor-pointer hover:brightness-95 transition' : ''}`}
      title={`สถานะรายการอาหาร: ได้รับ/เสิร์ฟแล้ว ${summary.completedLines} จาก ${summary.totalLines} รายการ${
        summary.cancelledLines > 0 ? ` (ยกเลิก/หมด ${summary.cancelledLines})` : ''
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          summary.isAllCompleted ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
        }`}
      />
      <span>
        {summary.isAllCompleted
          ? `ครบ ${summary.completedLines}/${summary.totalLines}`
          : `ได้ ${summary.completedLines}/${summary.totalLines} รายการ`}
      </span>
      {summary.cancelledLines > 0 && (
        <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 border border-rose-300 text-[9px] font-black">
          ยกเลิก {summary.cancelledLines}
        </span>
      )}
    </Tag>
  );
};
