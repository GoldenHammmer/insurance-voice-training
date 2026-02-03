"use client";

import { useEffect, useState } from 'react';
import type { RapportStatus } from '@/lib/rapport/engine';

// 組件的 Props 定義
interface RapportIndicatorProps {
  status: RapportStatus;                    // 當前客情狀態
  detectedPosture?: string;                 // 偵測到的薩提爾姿態
  suggestedStrategy?: string;               // 建議的應對策略
  responseGuide?: string;                   // 話術指引
  showDetailedAdvice?: boolean;             // 是否顯示詳細建議
  isTrainingActive?: boolean;               // 訓練是否進行中
}

// 薩提爾姿態的中文標籤對應
const POSTURE_LABELS: Record<string, string> = {
  'placating': '討好型態度',
  'blaming': '指責型態度',
  'super_reasonable': '超理智型態度',
  'irrelevant': '打岔型態度'
};

export default function RapportIndicator({
  status,
  detectedPosture,
  suggestedStrategy,
  responseGuide,
  showDetailedAdvice = true,
  isTrainingActive = false
}: RapportIndicatorProps) {
  // 用於觸發動畫效果的狀態
  const [prevScore, setPrevScore] = useState(status.score);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldPulse, setShouldPulse] = useState(false);

  // 當分數變化時觸發動畫
  useEffect(() => {
    if (prevScore !== status.score) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setPrevScore(status.score);
      }, 600); // 動畫持續 600 毫秒

      return () => clearTimeout(timer);
    }
  }, [status.score, prevScore]);

  // 當進入危險區域時觸發脈動效果
  useEffect(() => {
    if (status.level === 'danger' && isTrainingActive) {
      setShouldPulse(true);
    } else {
      setShouldPulse(false);
    }
  }, [status.level, isTrainingActive]);

  // 根據客情等級選擇圖示
  const getStatusIcon = () => {
    switch (status.level) {
      case 'danger':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'good':
        return '✅';
      default:
        return '📊';
    }
  };

  // 根據客情等級選擇背景漸層
  const getBackgroundGradient = () => {
    switch (status.level) {
      case 'danger':
        return 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
      case 'warning':
        return 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
      case 'good':
        return 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)';
      default:
        return 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
    }
  };

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: `2px solid ${status.color}`,
        animation: shouldPulse ? 'pulse 2s ease-in-out infinite' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {/* 標題區域 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>🤝</span>
          <span>客情狀態</span>
        </h3>
        <span style={{ fontSize: '24px' }}>
          {getStatusIcon()}
        </span>
      </div>

      {/* 進度條區域 */}
      <div style={{
        marginBottom: '16px'
      }}>
        <div style={{
          height: '12px',
          background: '#e5e7eb',
          borderRadius: '6px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* 漸層背景（顯示完整的色譜） */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%)',
            opacity: 0.3
          }} />
          
          {/* 實際進度條 */}
          <div style={{
            height: '100%',
            width: `${status.score}%`,
            background: status.color,
            borderRadius: '6px',
            transition: isAnimating ? 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'width 0.3s ease',
            boxShadow: `0 0 8px ${status.color}40`
          }} />
        </div>

        {/* 分數刻度標記 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '10px',
          color: '#9ca3af'
        }}>
          <span>0</span>
          <span>30</span>
          <span>70</span>
          <span>100</span>
        </div>
      </div>

      {/* 分數和狀態標籤區域 */}
      <div style={{
        background: getBackgroundGradient(),
        borderRadius: '8px',
        padding: '16px',
        marginBottom: detectedPosture || (showDetailedAdvice && suggestedStrategy) ? '16px' : '0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: status.color,
              lineHeight: 1,
              marginBottom: '4px'
            }}>
              {status.score}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: status.color
            }}>
              {status.label}
            </div>
          </div>
          
          {detectedPosture && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.8)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#4b5563',
              border: '1px solid rgba(0, 0, 0, 0.1)'
            }}>
              {POSTURE_LABELS[detectedPosture] || detectedPosture}
            </div>
          )}
        </div>

        <div style={{
          fontSize: '13px',
          color: '#4b5563',
          lineHeight: '1.5'
        }}>
          {status.description}
        </div>
      </div>

      {/* 建議策略區域（僅在有建議且開啟詳細建議時顯示） */}
      {showDetailedAdvice && suggestedStrategy && (
        <div style={{
          background: '#f9fafb',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px',
          borderLeft: `3px solid ${status.color}`
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>💡</span>
            <span>應對策略</span>
          </div>
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            lineHeight: '1.5'
          }}>
            {suggestedStrategy}
          </div>
        </div>
      )}

      {/* 話術指引區域（僅在有指引且開啟詳細建議時顯示） */}
      {showDetailedAdvice && responseGuide && (
        <div style={{
          background: '#eff6ff',
          borderRadius: '8px',
          padding: '12px',
          borderLeft: '3px solid #3b82f6'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#1e40af',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>💬</span>
            <span>話術建議</span>
          </div>
          <div style={{
            fontSize: '12px',
            color: '#1e40af',
            lineHeight: '1.5',
            fontStyle: 'italic'
          }}>
            「{responseGuide}」
          </div>
        </div>
      )}

      {/* 一般建議區域（沒有具體策略時顯示通用建議） */}
      {!suggestedStrategy && (
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          lineHeight: '1.5',
          padding: '8px',
          background: '#f9fafb',
          borderRadius: '6px'
        }}>
          💡 {status.advice}
        </div>
      )}

      {/* CSS 動畫定義 */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          }
        }
      `}</style>
    </div>
  );
}
