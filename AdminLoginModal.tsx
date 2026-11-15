import React, { useEffect, useRef, useState } from 'react';
import { Delete, Eye, EyeOff, Lock, ShieldCheck, X } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPlainPin, setShowPlainPin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Default master PIN for Baan Steak
  const MASTER_PIN = '0850451606';

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMessage(null);
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const performLogin = (token?: string) => {
    const sessionToken = token || `vcl_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('admin_session_token', sessionToken);
    setPin('');
    setIsLoading(false);
    onLoginSuccess();
  };

  const verifyPin = async (rawPin: string) => {
    const cleanPin = rawPin.replace(/[^0-9]/g, '');

    if (!cleanPin) {
      setErrorMessage('กรุณากรอกรหัส PIN');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // 1. Instant check for Master PIN (0850451606)
    if (cleanPin === MASTER_PIN) {
      performLogin();
      return;
    }

    // 2. Also try backend server API if running on Node environment
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin }),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success && data.token) {
            performLogin(data.token);
            return;
          }
        }
      }
    } catch {
      // Backend not running (e.g. Vercel static SPA)
    }

    setErrorMessage('รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPin(pin);
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 10) {
      const next = pin + digit;
      setPin(next);
      setErrorMessage(null);
      if (next.length === 10) {
        verifyPin(next);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs animate-fadeIn text-stone-900 font-['Prompt',sans-serif]">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-stone-900 leading-tight">
                เข้าสู่ระบบ Admin
              </h3>
              <p className="text-[11px] text-stone-500 font-medium">
                ร้านบ้าน สเต็กออนไลน์
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Prompt */}
        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs text-stone-600 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>กรุณากรอกรหัส PIN ผู้ดูแลระบบ (10 หลัก) เพื่อเข้าสู่ระบบ</span>
        </div>

        {/* PIN Input Form (Visible & Editable on all mobile/desktop devices) */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700">
              กรอกรหัส PIN (10 หลัก):
            </label>
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type={showPlainPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={pin}
                placeholder="••••••••••"
                autoComplete="off"
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                  setPin(val);
                  setErrorMessage(null);
                  if (val.length === 10) {
                    verifyPin(val);
                  }
                }}
                className="w-full py-3 pl-4 pr-11 bg-stone-50 border-2 border-stone-200 focus:border-red-500 focus:bg-white rounded-2xl text-center text-lg font-mono font-bold tracking-widest text-stone-900 outline-none transition shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPlainPin(!showPlainPin)}
                className="absolute right-3 p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer transition"
                title={showPlainPin ? 'ซ่อนรหัส' : 'แสดงรหัส'}
              >
                {showPlainPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Masked Visual Dots Indicator */}
          <div className="flex items-center justify-center gap-1.5 py-1">
            {Array.from({ length: 10 }).map((_, idx) => {
              const isFilled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
                    isFilled
                      ? 'bg-red-600 scale-125'
                      : 'border border-stone-300 bg-stone-100'
                  }`}
                />
              );
            })}
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-center font-bold animate-shake">
              {errorMessage}
            </div>
          )}

          {/* On-screen Keypad */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={isLoading || pin.length >= 10}
                onClick={() => handleKeypadPress(digit)}
                className="h-11 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 font-extrabold text-base transition flex items-center justify-center shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              disabled={isLoading || pin.length === 0}
              onClick={handleClear}
              className="h-11 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-600 active:scale-95 font-bold text-xs transition flex items-center justify-center disabled:opacity-40 cursor-pointer"
            >
              ล้าง
            </button>

            <button
              type="button"
              disabled={isLoading || pin.length >= 10}
              onClick={() => handleKeypadPress('0')}
              className="h-11 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 font-extrabold text-base transition flex items-center justify-center shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              0
            </button>

            <button
              type="button"
              disabled={isLoading || pin.length === 0}
              onClick={handleBackspace}
              className="h-11 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 transition flex items-center justify-center disabled:opacity-40 cursor-pointer"
              title="ลบตัวเลขล่าสุด"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          {/* Submit Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isLoading || pin.length === 0}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-98 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันเข้าสู่ระบบ Admin'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginModal;
