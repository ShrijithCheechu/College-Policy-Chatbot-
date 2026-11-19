import React, { useState, useEffect } from 'react';
import { Settings, X, Save, CheckCircle2, Sliders, Shield, FileCode2 } from 'lucide-react';

export const SystemPromptModal = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/system-prompt/')
        .then(res => res.json())
        .then(data => setConfig(data))
        .catch(err => console.error("Error fetching prompt config:", err));
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!config) return;
    setLoading(true);
    fetch('/api/v1/system-prompt/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setSaved(true);
        setLoading(false);
        setTimeout(() => setSaved(false), 2500);
      })
      .catch(err => {
        console.error("Error saving prompt config:", err);
        setLoading(false);
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/30 text-blue-400">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold">System Prompt & RAG Settings</h3>
              <p className="text-xs text-gray-400">SRS Section 4.2 System Prompt & Model Parameters (FR-ADM-04)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm">
          {config ? (
            <>
              {/* Parameter Row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Core Model</label>
                  <input
                    type="text"
                    value={config.model_name}
                    onChange={e => setConfig({ ...config, model_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="gemini-1.5-flash"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Temperature ({config.temperature})
                  </label>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={config.temperature}
                    onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer mt-1"
                  />
                  <span className="text-[10px] text-gray-400">SRS recommends 0.1 - 0.3</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Top-K Excerpts</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={config.top_k}
                    onChange={e => setConfig({ ...config, top_k: parseInt(e.target.value) || 6 })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* System Prompt View */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <FileCode2 size={14} className="text-blue-600" />
                    <span>SRS Section 4.2 System Prompt Template</span>
                  </label>
                  <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    Includes required client grounding rules
                  </span>
                </div>
                <textarea
                  rows={14}
                  value={config.system_prompt}
                  onChange={e => setConfig({ ...config, system_prompt: e.target.value })}
                  className="w-full font-mono text-xs p-3 bg-gray-50 border border-gray-300 rounded-xl leading-relaxed text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Grounding Info Alert */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs">
                <Shield size={16} className="text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">Grounding Safeguard Active:</span>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    The prompt strictly restricts answers to supplied source excerpts. Off-topic queries or queries with unsupported answers trigger polite declines without hallucination.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-gray-400 text-xs">Loading configuration...</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50">
          <div>
            {saved && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle2 size={15} /> Saved successfully!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <Save size={14} />
              <span>{loading ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
