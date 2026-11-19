import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  BarChart2,
  BookOpen,
  HelpCircle,
  Paperclip,
  Send,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ChevronDown,
  RotateCw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Globe,
  MessageSquare,
  Sparkles,
  Plus
} from 'lucide-react';
import { CrestLogo, RobotAvatar } from './components/Icons';
import { DocumentPreview } from './components/DocumentPreview';
import { SystemPromptModal } from './components/SystemPromptModal';
import { CollegeWebsiteModal } from './components/CollegeWebsiteModal';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [previewPage, setPreviewPage] = useState(5);
  const [previewHighlight, setPreviewHighlight] = useState('75%');
  
  const [messages, setMessages] = useState([
    {
      id: 'seed-1',
      sender: 'user',
      content: 'What is the attendance policy?',
      time: '10:24 AM'
    },
    {
      id: 'seed-2',
      sender: 'bot',
      content:
        'According to the Northbridge College Policy Handbook, students must attend at least 75% of classes in each course. Students with attendance between 65% and 74.9% may be considered on medical or other documented grounds.',
      citations: [
        {
          document: 'Policy Handbook.pdf',
          page: 5,
          section: 'Section 3.1'
        }
      ],
      is_not_found: false,
      time: '10:24 AM'
    },
    {
      id: 'seed-3',
      sender: 'user',
      content: 'What is the minimum passing percentage?',
      time: '10:25 AM'
    },
    {
      id: 'seed-4',
      sender: 'bot',
      content:
        "I couldn't find this information in the uploaded documents. Please try asking about another topic from the provided files.",
      citations: [],
      is_not_found: true,
      time: '10:25 AM'
    }
  ]);

  const [retrievedSources, setRetrievedSources] = useState([
    {
      id: 'seed-src-1',
      document: 'Policy Handbook.pdf',
      page: 5,
      section: 'Attendance Policy',
      snippet: 'Students must attend at least 75% of classes in each course...'
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState('default');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Modals
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch documents on load
  const loadDocuments = () => {
    fetch('/api/v1/documents/')
      .then(res => res.json())
      .then(data => {
        setDocuments(data);
        if (data.length > 0 && !activeDoc) {
          const defaultDoc = data.find(d => d.filename.includes('Policy')) || data[0];
          setActiveDoc(defaultDoc);
        }
      })
      .catch(err => console.error("Error loading documents:", err));
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Handle Send Message
  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isGenerating) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      content: textToSend.trim(),
      time: timeStr
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsGenerating(true);

    try {
      const activeIds = documents.filter(d => d.is_active).map(d => d.id);
      const res = await fetch('/api/v1/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          session_id: sessionId,
          active_document_ids: activeIds
        })
      });

      const data = await res.json();
      if (res.ok) {
        const botMsg = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          content: data.answer,
          citations: data.citations || [],
          is_not_found: data.is_not_found || false,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);

        if (data.retrieved_sources && data.retrieved_sources.length > 0) {
          setRetrievedSources(data.retrieved_sources);
          // auto preview top retrieved chunk
          const topSrc = data.retrieved_sources[0];
          const matchedDoc = documents.find(d => d.filename === topSrc.document);
          if (matchedDoc) {
            setActiveDoc(matchedDoc);
            setPreviewPage(topSrc.page);
            setPreviewHighlight(topSrc.snippet.slice(0, 30));
          }
        }
      } else {
        const errorMsg = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          content: data.error || 'An error occurred while querying the document.',
          citations: [],
          is_not_found: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        content: "Error communicating with server.",
        citations: [],
        is_not_found: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadLoading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);

    try {
      const res = await fetch('/api/v1/documents/', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        loadDocuments();
        setActiveDoc(data);
      } else {
        setUploadError(data.error || 'Upload failed');
      }
    } catch (err) {
      setUploadError('Failed to upload document');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteDocument = async (e, docId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await fetch(`/api/v1/documents/${docId}/`, { method: 'DELETE' });
      loadDocuments();
      if (activeDoc?.id === docId) {
        setActiveDoc(null);
      }
    } catch (err) {
      console.error("Error deleting doc:", err);
    }
  };

  const handleToggleDocActive = async (e, docId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/documents/${docId}/toggle-active/`, { method: 'POST' });
      const updated = await res.json();
      setDocuments(docs => docs.map(d => d.id === docId ? updated : d));
    } catch (err) {
      console.error("Error toggling active:", err);
    }
  };

  const handleCitationClick = (citation) => {
    const docName = citation.document || citation.filename;
    const doc = documents.find(d => d.filename.toLowerCase() === docName?.toLowerCase());
    if (doc) {
      setActiveDoc(doc);
    }
    if (citation.page) {
      setPreviewPage(citation.page);
    }
    if (citation.snippet) {
      setPreviewHighlight(citation.snippet.slice(0, 30));
    } else if (citation.section) {
      setPreviewHighlight(citation.section);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setRetrievedSources([]);
    setSessionId(Date.now().toString());
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleFeedback = (msgId, type) => {
    fetch('/api/v1/feedback/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: msgId, feedback: type })
    }).catch(err => console.error(err));

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: type } : m));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f1f5f9] overflow-hidden font-sans">
      {/* Top Header Navbar */}
      <header className="h-14 bg-[#0a192f] text-white px-5 flex items-center justify-between shadow-md shrink-0 select-none z-20">
        <div className="flex items-center gap-3">
          <CrestLogo size={34} />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight leading-none text-white">
              Northbridge College
            </span>
            <span className="text-[10px] text-blue-200/80 tracking-wide font-normal">
              of Arts, Science and Technology
            </span>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white shadow-inner border border-white/15"
          >
            <MessageSquare size={13} className="text-blue-400" />
            <span>Policy Assistant</span>
          </button>
          <button
            onClick={() => setIsWebsiteModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-blue-200 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Globe size={13} />
            <span>College Website</span>
          </button>
        </div>

        {/* Right Section: Config Gear & Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPromptModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
            title="System Prompt & Model Config (FR-ADM-04)"
          >
            <Settings size={13} />
            <span className="hidden sm:inline">System Prompt</span>
          </button>

          <button
            onClick={handleNewChat}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-600/60 hover:bg-blue-600 text-white transition-colors"
            title="Start New Chat"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
            <div className="w-7 h-7 rounded-full bg-[#1e3a8a] border border-blue-400/40 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              N
            </div>
            <ChevronDown size={13} className="text-blue-300" />
          </div>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR: Documents & Quick Actions */}
        <aside className="w-72 bg-white border-r border-gray-200 flex flex-col p-4 space-y-4 shrink-0 overflow-y-auto">
          {/* Your Documents Header */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-gray-800 tracking-tight">Your Documents</span>
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold flex items-center justify-center border border-blue-200">
                {documents.length}
              </span>
            </div>

            {/* Document List */}
            <div className="space-y-2">
              {documents.map(doc => {
                const isSelected = activeDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setActiveDoc(doc);
                      setPreviewPage(1);
                    }}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-400 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                        <FileText size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate" title={doc.filename}>
                          {doc.filename}
                        </p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                          <span>{doc.pages} pages</span>
                          <span>•</span>
                          <span className={doc.status === 'ready' ? 'text-emerald-600 font-medium' : 'text-amber-600'}>
                            {doc.status === 'ready' ? 'Ready' : doc.status}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {doc.status === 'ready' && (
                        <CheckCircle2 size={15} className="text-emerald-600" />
                      )}
                      <button
                        onClick={(e) => handleDeleteDocument(e, doc.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-1 transition-opacity"
                        title="Delete Document"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upload More Documents Box */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files[0])}
              className="hidden"
              accept=".pdf,.docx,.txt,.md"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.length) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50/70 transition-all rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer text-center group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                <UploadCloud size={18} />
              </div>
              <span className="text-xs font-bold text-gray-800 group-hover:text-blue-700">
                Upload More Documents
              </span>
              <span className="text-[10px] text-gray-500 mt-0.5">PDF, DOCX, TXT up to 20MB</span>
              {uploadLoading && (
                <div className="mt-2 text-[11px] text-blue-600 font-medium flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing document...</span>
                </div>
              )}
              {uploadError && (
                <span className="text-[10px] text-red-600 mt-1 font-medium">{uploadError}</span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <span className="text-xs font-bold text-gray-800 tracking-tight block mb-2">Quick Actions</span>
            <div className="space-y-1.5">
              <button
                onClick={() => handleSendMessage("Summarize the attendance and examination policies.")}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-300 text-gray-700 text-xs font-medium transition-colors text-left"
              >
                <BarChart2 size={14} className="text-blue-600 shrink-0" />
                <span>Summarize Document</span>
              </button>
              <button
                onClick={() => handleSendMessage("Explain Section 3 of the Attendance Policy in detail.")}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-300 text-gray-700 text-xs font-medium transition-colors text-left"
              >
                <BookOpen size={14} className="text-blue-600 shrink-0" />
                <span>Explain a Section</span>
              </button>
              <button
                onClick={() => handleSendMessage("What is the attendance policy?")}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-300 text-gray-700 text-xs font-medium transition-colors text-left"
              >
                <HelpCircle size={14} className="text-blue-600 shrink-0" />
                <span>Ask a Question</span>
              </button>
            </div>
          </div>

          {/* Promotional Card at bottom */}
          <div className="mt-auto pt-2">
            <div className="relative rounded-2xl overflow-hidden shadow-sm bg-gradient-to-br from-[#0c234a] to-[#1e3a8a] text-white p-3.5">
              <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                <span className="text-base">🎓</span>
                <span className="text-[11px] font-bold text-white tracking-tight">Verified Authority</span>
              </div>
              <p className="text-xs font-semibold leading-tight text-white mb-2">
                Get answers from official college policies!
              </p>
              <div className="w-full h-16 bg-blue-950/60 rounded-lg flex items-center justify-center border border-white/10 text-center text-[10px] text-blue-200/90 p-2">
                🏛️ Northbridge College of Arts, Science and Technology Official Archive
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER COLUMN: Main Chat Assistant */}
        <main className="flex-1 flex flex-col bg-[#f8fafc] overflow-hidden relative">
          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Robot Hero Welcome Card */}
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-blue-100">
                <RobotAvatar size={48} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles size={14} className="text-amber-500 fill-amber-500" />
                  <h2 className="text-sm font-bold text-gray-900 tracking-tight">Policy Assistant</h2>
                </div>
                <p className="text-xs text-blue-950/80 font-medium mb-1.5">
                  ✦ Ask anything about your college policy documents
                </p>
                <div className="inline-block bg-white/90 border border-blue-200/60 rounded-xl px-3 py-1.5 text-[11px] text-gray-600 shadow-2xs">
                  I can help you find information from the provided documents. Ask me to summarize, explain, or answer questions!
                </div>
              </div>
            </div>

            {/* Render Messages */}
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id || index}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-3`}
                >
                  <div className={`flex items-start gap-2.5 max-w-[82%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    {isUser ? (
                      <div className="w-7 h-7 rounded-full bg-[#0a192f] text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-xs mt-1">
                        👤
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-xl bg-white border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs mt-1">
                        <RobotAvatar size={20} />
                      </div>
                    )}

                    {/* Bubble */}
                    <div className="flex flex-col">
                      {msg.is_not_found ? (
                        /* Not Found Alert Bubble (Matches Mockup exact red box) */
                        <div className="bg-[#fff1f2] border border-[#fecdd3] text-[#9f1239] rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed flex items-start gap-2.5">
                          <AlertCircle size={18} className="text-[#e11d48] shrink-0 mt-0.5" />
                          <div className="font-medium">
                            {msg.content}
                          </div>
                        </div>
                      ) : isUser ? (
                        /* User Bubble (Deep Blue) */
                        <div className="bg-[#0b2447] text-white rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-sm text-xs font-medium leading-relaxed">
                          {msg.content}
                        </div>
                      ) : (
                        /* Assistant Bubble (Clean Card) */
                        <div className="bg-white border border-gray-200/80 rounded-2xl rounded-tl-xs p-4 shadow-sm text-xs text-gray-800 leading-relaxed space-y-2.5">
                          <div>{msg.content}</div>

                          {/* Nested Citation Card (Matches Mockup) */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-2.5 p-2.5 rounded-xl bg-[#f0f7ff] border border-[#bfdbfe] flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 text-blue-900">
                                <FileText size={15} className="text-blue-600 shrink-0" />
                                <span className="text-[11px] font-semibold truncate">
                                  Source: {msg.citations[0].document} • Page {msg.citations[0].page}, {msg.citations[0].section}
                                </span>
                              </div>
                              <button
                                onClick={() => handleCitationClick(msg.citations[0])}
                                className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline shrink-0 bg-white px-2 py-1 rounded-md border border-blue-200 shadow-2xs"
                              >
                                <span>View Source</span>
                                <ExternalLink size={11} />
                              </button>
                            </div>
                          )}

                          {/* Message Actions */}
                          <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCopyMessage(msg.content)}
                                className="hover:text-gray-700 p-0.5 rounded"
                                title="Copy answer"
                              >
                                <Copy size={12} />
                              </button>
                              <button
                                onClick={() => handleFeedback(msg.id, 'up')}
                                className={`p-0.5 rounded ${msg.feedback === 'up' ? 'text-blue-600' : 'hover:text-gray-700'}`}
                                title="Helpful"
                              >
                                <ThumbsUp size={12} />
                              </button>
                              <button
                                onClick={() => handleFeedback(msg.id, 'down')}
                                className={`p-0.5 rounded ${msg.feedback === 'down' ? 'text-red-600' : 'hover:text-gray-700'}`}
                                title="Not helpful"
                              >
                                <ThumbsDown size={12} />
                              </button>
                            </div>
                            <span className="text-[10px] text-gray-400">{msg.time || '10:24 AM'}</span>
                          </div>
                        </div>
                      )}

                      {/* Timestamp for user message */}
                      {isUser && (
                        <span className="text-[10px] text-gray-400 self-end mt-1 mr-1">
                          {msg.time || '10:24 AM'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isGenerating && (
              <div className="flex items-center gap-2.5 text-xs text-gray-500">
                <div className="w-7 h-7 rounded-xl bg-white border border-blue-200 flex items-center justify-center">
                  <RobotAvatar size={20} />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-3.5 py-2 flex items-center gap-1.5 shadow-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-[11px] text-gray-500 ml-1">Searching policy documents...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="p-4 bg-white/80 backdrop-blur-xs border-t border-gray-200 shrink-0">
            <div className="max-w-3xl mx-auto relative flex items-center bg-white border border-gray-300 rounded-full px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                title="Attach Document"
              >
                <Paperclip size={18} />
              </button>

              <input
                type="text"
                value={inputMessage}
                maxLength={4000}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask a question about your documents..."
                className="flex-1 px-3 py-1 text-xs text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none"
              />

              <button
                type="button"
                disabled={!inputMessage.trim() || isGenerating}
                onClick={() => handleSendMessage()}
                className="w-8 h-8 rounded-full bg-[#0a192f] hover:bg-blue-900 active:scale-95 disabled:opacity-40 disabled:hover:bg-[#0a192f] text-white flex items-center justify-center transition-all shadow-xs"
                title="Send Message"
              >
                <Send size={14} className="ml-0.5" />
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-400 mt-1.5">
              Strictly grounded on official uploaded documents. Gemini API Core Model with SRS Section 4.2 system prompt.
            </p>
          </div>
        </main>

        {/* RIGHT SIDEBAR: Retrieved Sources & Document Preview */}
        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col p-4 space-y-4 shrink-0 overflow-y-auto">
          {/* Retrieved Sources Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <BookOpen size={15} className="text-blue-600" />
                <span>Retrieved Sources</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {retrievedSources.length} found
              </span>
            </div>

            {/* Source Cards */}
            <div className="space-y-2">
              {retrievedSources.map((src, i) => (
                <div
                  key={src.id || i}
                  onClick={() => handleCitationClick(src)}
                  className="p-2.5 rounded-xl border border-gray-200 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                        <FileText size={11} />
                      </div>
                      <span className="text-xs font-bold text-gray-800 truncate">
                        {src.document}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                      Page {src.page} • {src.section} &gt;
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed italic group-hover:text-gray-800">
                    "{src.snippet}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Document Preview Section */}
          <div className="flex-1 flex flex-col min-h-[360px]">
            <DocumentPreview
              activeDoc={activeDoc}
              targetPage={previewPage}
              highlightText={previewHighlight}
              onPageChange={(p) => setPreviewPage(p)}
            />
          </div>
        </aside>
      </div>

      {/* System Prompt & Configuration Modal (FR-ADM-04) */}
      <SystemPromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
      />

      {/* College Website Modal */}
      <CollegeWebsiteModal
        isOpen={isWebsiteModalOpen}
        onClose={() => setIsWebsiteModalOpen(false)}
      />
    </div>
  );
}
