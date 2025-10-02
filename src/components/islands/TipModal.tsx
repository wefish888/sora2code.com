import { useEffect, useState } from 'react';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  code: string;
}

// 只保留 USDT (TRC20)
const USDT_ADDRESS = 'TAXDmEbSofko7u1eKXDR6orLQ1SVqgqRdh';

// 生成二维码 URL (使用免费 API)
const generateQRCode = (address: string) => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;
};

export default function TipModal({ isOpen, onClose, onConfirm, code }: TipModalProps) {
  const [countdown, setCountdown] = useState(10);
  const [canSkip, setCanSkip] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setCountdown(10);
      setCanSkip(false);
      setCopiedAddress(false);
      return;
    }

    // 生成二维码
    setQrCodeUrl(generateQRCode(USDT_ADDRESS));

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanSkip(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(USDT_ADDRESS);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const handleSkip = () => {
    onConfirm();
    onClose();
  };

  const handleDonated = () => {
    // Show thank you message
    alert('🙏 Thank you for your support! Your generosity helps us maintain this free service.');
    onConfirm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm"
        onClick={canSkip ? onClose : undefined}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all animate-scale-in">
          {/* Close button (only after countdown) */}
          {canSkip && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              ☕ Support Us with USDT?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              This service is free and maintained by volunteers. <br />
              A small tip helps us keep it running!
            </p>
          </div>

          {/* QR Code & Address */}
          <div className="mb-6">
            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-xl shadow-lg border-4 border-green-500">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="USDT TRC20 QR Code"
                    className="w-48 h-48"
                    onError={(e) => {
                      // Fallback if QR code fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">Loading QR...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Network Badge */}
            <div className="text-center mb-4">
              <span className="inline-block bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-4 py-2 rounded-full text-sm font-semibold">
                🌐 TRC20 Network (Low Fees)
              </span>
            </div>

            {/* Address Display */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium text-center">
                USDT (TRC20) Address:
              </div>
              <div className="font-mono text-xs text-gray-800 dark:text-gray-200 break-all mb-3 text-center bg-white dark:bg-gray-800 p-2 rounded">
                {USDT_ADDRESS}
              </div>
              <button
                onClick={handleCopyAddress}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  copiedAddress
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                }`}
              >
                {copiedAddress ? '✅ Address Copied!' : '📋 Copy Address'}
              </button>
            </div>
          </div>

          {/* Suggested Amounts */}
          <div className="mb-6">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
              Suggested amounts (optional):
            </div>
            <div className="flex gap-2 justify-center">
              {['$1', '$3', '$5', '$10'].map((amount) => (
                <div
                  key={amount}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium"
                >
                  {amount}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleDonated}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
            >
              🎉 I've Sent a Tip!
            </button>

            <button
              onClick={handleSkip}
              disabled={!canSkip}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                canSkip
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              {canSkip ? (
                '⏭️ Skip and Copy Code'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Please wait {countdown} seconds...
                </span>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            <p>💝 Every contribution counts, no matter how small!</p>
            <p className="mt-1">🔒 We never see your transaction details</p>
          </div>
        </div>
      </div>
    </div>
  );
}
