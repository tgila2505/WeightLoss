'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import { NavBar } from '../components/nav-bar';
import { getGroqKey, getMistralKey, setAiKeys, clearAiKeys } from '../../lib/ai-keys';

export default function SettingsPage() {
  const [groqKey, setGroqKey] = useState('');
  const [mistralKey, setMistralKey] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showMistralKey, setShowMistralKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setGroqKey(getGroqKey() ?? '');
    setMistralKey(getMistralKey() ?? '');
  }, []);

  function handleSave() {
    if (groqKey.trim() && mistralKey.trim()) {
      setAiKeys(groqKey.trim(), mistralKey.trim());
    } else {
      clearAiKeys();
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleClear() {
    clearAiKeys();
    setGroqKey('');
    setMistralKey('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const bothSet = Boolean(groqKey.trim() && mistralKey.trim());

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Settings</p>
          <h1 style={{ margin: '4px 0 8px' }}>AI provider setup</h1>
          <p style={mutedStyle}>
            Configure Groq (primary) and Mistral (fallback) to enable personalised AI responses.
          </p>
        </div>
        <NavBar current="Settings" />
      </header>

      <div style={cardStyle}>
        <div style={statusRowStyle}>
          <span style={{ fontWeight: 600 }}>Status</span>
          <span style={bothSet ? activeTagStyle : inactiveTagStyle}>
            {bothSet ? 'AI active' : 'Using built-in rules'}
          </span>
        </div>

        <div style={{ display: 'grid', gap: '24px', marginTop: '24px' }}>
          <div style={providerBlockStyle}>
            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>
              Groq <span style={badgeStyle}>Primary</span>
            </p>
            <p style={{ margin: '0 0 10px', color: '#4b5563', fontSize: '13px' }}>
              Get a free key at <strong>console.groq.com</strong> → API Keys → Create API Key
            </p>
            <div style={{ position: 'relative' }}>
              <input
                type={showGroqKey ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                style={{ ...inputStyle, paddingRight: '80px' }}
              />
              <button type="button" onClick={() => setShowGroqKey((v) => !v)} style={showHideStyle}>
                {showGroqKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div style={providerBlockStyle}>
            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>
              Mistral <span style={{ ...badgeStyle, backgroundColor: '#f3f4f6', color: '#374151' }}>Fallback</span>
            </p>
            <p style={{ margin: '0 0 10px', color: '#4b5563', fontSize: '13px' }}>
              Get a free key at <strong>console.mistral.ai</strong> → API Keys → Create new key
            </p>
            <div style={{ position: 'relative' }}>
              <input
                type={showMistralKey ? 'text' : 'password'}
                value={mistralKey}
                onChange={(e) => setMistralKey(e.target.value)}
                placeholder="..."
                style={{ ...inputStyle, paddingRight: '80px' }}
              />
              <button type="button" onClick={() => setShowMistralKey((v) => !v)} style={showHideStyle}>
                {showMistralKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>

        {saved ? (
          <p style={{ marginTop: '16px', color: '#15803d', fontWeight: 600 }}>Saved.</p>
        ) : null}

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button type="button" onClick={handleSave} style={primaryButtonStyle}>
            Save keys
          </button>
          {bothSet ? (
            <button type="button" onClick={handleClear} style={secondaryButtonStyle}>
              Remove keys
            </button>
          ) : null}
        </div>

        <p style={{ marginTop: '16px', fontSize: '13px', color: '#6b7280' }}>
          Keys are stored only in your browser (localStorage) and never sent to our servers.
        </p>
      </div>
    </main>
  );
}

const pageStyle: CSSProperties = { minHeight: '100vh', padding: '32px 16px', maxWidth: '720px', margin: '0 auto' };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' };
const eyebrowStyle: CSSProperties = { margin: 0, color: '#2563eb', fontWeight: 600, fontSize: '14px' };
const mutedStyle: CSSProperties = { margin: 0, color: '#64748b' };
const cardStyle: CSSProperties = { backgroundColor: '#ffffff', borderRadius: '18px', padding: '24px', boxShadow: '0 14px 40px rgba(15,23,42,0.08)' };
const statusRowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const activeTagStyle: CSSProperties = { padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, backgroundColor: '#dcfce7', color: '#15803d' };
const inactiveTagStyle: CSSProperties = { ...activeTagStyle, backgroundColor: '#fef3c7', color: '#92400e' };
const providerBlockStyle: CSSProperties = { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' };
const inputStyle: CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '16px', boxSizing: 'border-box' };
const showHideStyle: CSSProperties = { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', fontSize: '13px' };
const primaryButtonStyle: CSSProperties = { padding: '12px 18px', borderRadius: '10px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' };
const secondaryButtonStyle: CSSProperties = { ...primaryButtonStyle, backgroundColor: '#e5e7eb', color: '#111827' };
const badgeStyle: CSSProperties = { display: 'inline-block', marginLeft: '6px', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, backgroundColor: '#dbeafe', color: '#1d4ed8' };
