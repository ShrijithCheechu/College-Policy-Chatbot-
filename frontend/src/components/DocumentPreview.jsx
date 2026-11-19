import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

export const DocumentPreview = ({ activeDoc, targetPage = 5, highlightText = '', onPageChange }) => {
  const [currentPage, setCurrentPage] = useState(targetPage);
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (targetPage) {
      setCurrentPage(targetPage);
    }
  }, [targetPage]);

  useEffect(() => {
    if (!activeDoc?.id) return;
    setLoading(true);
    fetch(`/api/v1/documents/${activeDoc.id}/page/${currentPage}/`)
      .then(res => res.json())
      .then(data => {
        setPageData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading page content:", err);
        setLoading(false);
      });
  }, [activeDoc?.id, currentPage]);

  const handlePrev = () => {
    if (currentPage > 1) {
      const p = currentPage - 1;
      setCurrentPage(p);
      if (onPageChange) onPageChange(p);
    }
  };

  const handleNext = () => {
    const total = activeDoc?.pages || 20;
    if (currentPage < total) {
      const p = currentPage + 1;
      setCurrentPage(p);
      if (onPageChange) onPageChange(p);
    }
  };

  const renderHighlightedContent = (text) => {
    if (!text) return null;
    if (!highlightText) {
      return text.split('\n').map((line, idx) => (
        <p key={idx} className="mb-2 leading-relaxed text-gray-700 text-xs">
          {line}
        </p>
      ));
    }

    // Split text into lines
    return text.split('\n').map((line, idx) => {
      const isHighlighted = highlightText && line.toLowerCase().includes(highlightText.toLowerCase().slice(0, 20));
      return (
        <p
          key={idx}
          className={`mb-2 leading-relaxed text-xs transition-colors rounded px-1 ${
            isHighlighted ? 'bg-amber-100 text-amber-950 font-medium border-l-2 border-amber-500 py-0.5' : 'text-gray-700'
          }`}
        >
          {line}
        </p>
      );
    });
  };

  return (
    <div className={`preview-container ${isExpanded ? 'preview-expanded-modal' : ''}`}>
      <div className="preview-header flex items-center justify-between pb-2 mb-2 border-b border-gray-200">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
          <FileText size={15} className="text-blue-600" />
          <span>Document Preview</span>
          {activeDoc && (
            <span className="text-[11px] text-gray-400 font-normal truncate max-w-[120px]">
              ({activeDoc.filename})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-600"
            title="Previous Page"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[11px] font-medium text-gray-600">
            {currentPage}/{activeDoc?.pages || 20}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage >= (activeDoc?.pages || 20)}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-600"
            title="Next Page"
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 ml-1 rounded hover:bg-gray-100 text-gray-500"
            title={isExpanded ? "Close Fullscreen" : "Fullscreen Preview"}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Simulated Document Paper Page */}
      <div className="paper-sheet shadow-sm border border-gray-200 rounded-md bg-white p-3.5 min-h-[310px] max-h-[380px] overflow-y-auto font-sans relative flex flex-col justify-between">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Loading page {currentPage}...</span>
          </div>
        ) : (
          <div>
            {/* Top document stamp */}
            <div className="flex items-center justify-between text-[9px] text-gray-400 border-b border-gray-100 pb-1.5 mb-2.5">
              <span className="font-medium tracking-wide">
                {activeDoc?.filename === 'SRS_Document.pdf' 
                  ? 'Software Requirements Specification (SRS)'
                  : 'Northbridge College of Arts, Science and Technology'}
              </span>
              <span>{activeDoc?.filename === 'SRS_Document.pdf' ? 'Version 1.0' : 'Policy Handbook, Version 1.0'}</span>
            </div>

            {/* Document Body */}
            <div className="page-content text-[11px] text-gray-800">
              {pageData?.content ? (
                renderHighlightedContent(pageData.content)
              ) : (
                <div className="text-gray-400 italic text-center py-8">
                  No text extracted for page {currentPage}.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Paper Footer */}
        <div className="flex items-center justify-between text-[9px] text-gray-400 border-t border-gray-100 pt-2 mt-3">
          <span>Effective 1 January 2027</span>
          <span className="font-medium">Page {currentPage}</span>
        </div>
      </div>
    </div>
  );
};
