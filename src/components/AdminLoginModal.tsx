import React, { useEffect, useRef, useState } from 'react';
import { Delete, Lock, ShieldCheck, X } from 'lucide-react';

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically when opened
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMessage(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const verifyPin = async (cleanPin: string) => {
    if (!cleanPin) {
      setErrorMessage('กรุณากรอกรหัส PIN');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          sessionStorage.setItem('admin_session_token', data.token);
          setPin('');
          onLoginSuccess();
          onClose();
          return;
        } else {
          setErrorMessage(data.error || 'รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Backend server unavailable (e.g. pure static SPA)
    }

    // Direct client fallback verification (PIN 0850451606) for static host compatibility
    if (cleanPin === '0850451606') {
      const fallbackToken = `vcl_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('admin_session_token', fallbackToken);
      setPin('');
      onLoginSuccess();
      onClose();
      setIsLoading(false);
      return;
    }

    // Never reveal the secret PIN in the error message
    setErrorMessage('รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPin(pin.trim());
  };

  // Handle on-screen keypad clicks
  const handleKeypadPress = (digit: string) => {
    if (pin.length < 10) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMessage(null);
      if (newPin.length === 10) {
        verifyPin(newPin);
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
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-stone-900 leading-tight">
                เข้าสู่ระบบ Admin
              </h3>
              <p className="text-[11px] text-stone-500 font-medium">
                เฉพาะเจ้าของร้านและผู้ดูแล
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 10-Dot Masked Visual Indicator */}
        <div className="space-y-2 py-1">
          <div className="text-center text-xs font-bold text-stone-600">
            กรุณากรอกรหัส PIN (10 หลัก):
          </div>

          {/* Masked Dots: Completely hides numbers on screen */}
          <div className="flex items-center justify-center gap-2 py-2 bg-stone-50 rounded-2xl border border-stone-200 shadow-inner px-2">
            {Array.from({ length: 10 }).map((_, idx) => {
              const isFilled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 flex items-center justify-center ${
                    isFilled
                      ? 'bg-red-600 scale-110 shadow-xs'
                      : 'border-2 border-stone-300 bg-white'
                  }`}
                >
                  {isFilled && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                </div>
              );
            })}
          </div>

          {/* Hidden input for physical keyboard / mobile virtual keyboard with text masked */}
          <form onSubmit={handleSubmit} className="relative">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={10}
              value={pin}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                setPin(val);
                setErrorMessage(null);
                if (val.length === 10) {
                  verifyPin(val);
                }
              }}
              style={{
                WebkitTextSecurity: 'disc',
              } as React.CSSProperties}
              className="w-full h-0 opacity-0 absolute pointer-events-none"
            />
          </form>

          {errorMessage && (
            <p className="text-xs text-red-600 text-center font-bold animate-shake pt-1">
              {errorMessage}
            </p>
          )}
        </div>

        {/* On-screen Numeric Keypad for fast, secure entry (prevents mobile keyboard showing numbers) */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLoading || pin.length >= 10}
              onClick={() => handleKeypadPress(digit)}
              className="h-12 rounded-2xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 font-extrabold text-lg transition flex items-center justify-center shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            disabled={isLoading || pin.length === 0}
            onClick={handleClear}
            className="h-12 rounded-2xl bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-600 active:scale-95 font-bold text-xs transition flex items-center justify-center disabled:opacity-40 cursor-pointer"
          >
            ล้าง
          </button>

          <button
            type="button"
            disabled={isLoading || pin.length >= 10}
            onClick={() => handleKeypadPress('0')}
            className="h-12 rounded-2xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 font-extrabold text-lg transition flex items-center justify-center shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            disabled={isLoading || pin.length === 0}
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 transition flex items-center justify-center disabled:opacity-40 cursor-pointer"
            title="ลบตัวเลขล่าสุด"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => verifyPin(pin.trim())}
            disabled={isLoading || pin.length === 0}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-98 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isLoading ? 'กำลังตรวจสอบรหัส...' : 'ยืนยันเข้าสู่ระบบ Admin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
