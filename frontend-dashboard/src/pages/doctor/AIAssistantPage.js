// src/pages/doctor/AIAssistantPage.jsx
import React, { useState, useEffect } from 'react';
import { Bot, Send, Sparkles, FileText, Pill, AlertCircle, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../services/services';

const AIAssistantPage = () => {
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Load conversation from localStorage on mount
  useEffect(() => {
    const accepted = localStorage.getItem('ai_assistant_disclaimer_accepted');
    if (accepted === 'true') {
      setDisclaimerAccepted(true);
    } else {
      setShowDisclaimer(true);
    }

    // Restore conversation from localStorage
    const savedConversation = localStorage.getItem('ai_assistant_conversation');
    const savedConversationId = localStorage.getItem('ai_assistant_conversation_id');
    const savedSuggestions = localStorage.getItem('ai_assistant_suggestions');

    if (savedConversation) {
      try {
        setConversation(JSON.parse(savedConversation));
      } catch (e) {
        console.error('Failed to parse saved conversation:', e);
      }
    }

    if (savedConversationId) {
      setConversationId(savedConversationId);
    }

    if (savedSuggestions) {
      try {
        setSuggestions(JSON.parse(savedSuggestions));
      } catch (e) {
        console.error('Failed to parse saved suggestions:', e);
      }
    }
  }, []);

  // Auto-save conversation to localStorage whenever it changes
  useEffect(() => {
    if (conversation.length > 0) {
      localStorage.setItem('ai_assistant_conversation', JSON.stringify(conversation));
    }
  }, [conversation]);

  // Auto-save conversationId to localStorage
  useEffect(() => {
    if (conversationId) {
      localStorage.setItem('ai_assistant_conversation_id', conversationId);
    }
  }, [conversationId]);

  // Auto-save suggestions to localStorage
  useEffect(() => {
    if (suggestions.length > 0) {
      localStorage.setItem('ai_assistant_suggestions', JSON.stringify(suggestions));
    }
  }, [suggestions]);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('ai_assistant_disclaimer_accepted', 'true');
    setDisclaimerAccepted(true);
    setShowDisclaimer(false);
  };

  const handleSendMessage = async (messageText) => {
    if (!disclaimerAccepted) {
      setShowDisclaimer(true);
      return;
    }

    const textToSend = messageText || inputText;
    if (!textToSend.trim()) return;

    const userMessage = { role: 'user', content: textToSend };
    setConversation([...conversation, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await api.post('/chat/doctor-advisor', {
        message: textToSend,
        conversation_id: conversationId,
      });

      const data = response.data?.data || response.data;
      const aiMessage = {
        role: 'ai',
        content: data.response || 'Không có phản hồi',
      };
      
      setConversation([...conversation, userMessage, aiMessage]);
      setSuggestions(data.suggestions || []);
      
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }
    } catch (error) {
      console.error('❌ Error calling AI:', error);
      console.error('Response data:', error.response?.data);
      console.error('Status:', error.response?.status);
      
      let errorMsg = 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.';
      
      if (error.response?.data?.message) {
        errorMsg = `Lỗi: ${error.response.data.message}`;
      } else if (error.response?.status === 401) {
        errorMsg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response?.status === 403) {
        errorMsg = 'Bạn không có quyền sử dụng tính năng này.';
      } else if (error.message) {
        errorMsg = `Lỗi: ${error.message}`;
      }
      
      const errorMessage = {
        role: 'ai',
        content: errorMsg,
      };
      setConversation([...conversation, userMessage, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputText(suggestion);
    handleSendMessage(suggestion);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleNewChat = () => {
    // Clear conversation state
    setConversation([]);
    setSuggestions([]);
    setConversationId(null);
    setInputText('');
    
    // Clear from localStorage
    localStorage.removeItem('ai_assistant_conversation');
    localStorage.removeItem('ai_assistant_conversation_id');
    localStorage.removeItem('ai_assistant_suggestions');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">AI Doctor Advisor</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Hỗ trợ chẩn đoán, tư vấn điều trị và tra cứu y khoa</p>
        </div>
        <button
          onClick={handleNewChat}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
        >
          Cuộc hội thoại mới
        </button>
      </div>

      {/* Chat Area */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-700">
          <div className="flex items-center gap-3">
            <Bot size={24} className="text-purple-600 dark:text-purple-400" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">AI Doctor Advisor</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Chuyên gia tư vấn y khoa AI</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-900">
          {conversation.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot size={64} className="text-purple-300 dark:text-purple-600 mb-4" />
              <p className="text-slate-600 dark:text-slate-400 mb-2">Bắt đầu hỏi AI Doctor Advisor</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                Hỗ trợ chẩn đoán, tra cứu thuốc, phác đồ điều trị, phân tích xét nghiệm
              </p>
              
              {/* Initial suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 w-full max-w-2xl">
                {[
                  'Chẩn đoán phân biệt cho bệnh nhân sốt cao kéo dài',
                  'Xử trí ban đầu cho cơn đau thắt ngực cấp',
                  'Tương tác giữa Warfarin và các thuốc khác',
                  'Xét nghiệm cần làm cho nghi ngờ suy tim'
                ].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left text-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            conversation.map((msg, idx) => (
              <div
                key={idx}
                className={['flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start'].join(' ')}
              >
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                    <Bot size={16} />
                  </div>
                )}
                <div
                  className={[
                    'max-w-[75%] px-4 py-3 rounded-2xl',
                    msg.role === 'user'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100',
                  ].join(' ')}
                >
                  <div className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                    {msg.content}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                    BS
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white">
                <Bot size={16} />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions (if available) */}
        {suggestions.length > 0 && conversation.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Câu hỏi gợi ý:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-sm text-slate-700 dark:text-slate-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Hỏi về chẩn đoán, thuốc, xét nghiệm, điều trị..."
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={18} />
              Gửi
            </button>
          </div>
        </form>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">Lưu ý quan trọng</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              AI chỉ là công cụ hỗ trợ, không thay thế quyết định lâm sàng của bác sĩ. Vui lòng luôn sử dụng
              kiến thức chuyên môn và kinh nghiệm của bạn khi đưa ra chẩn đoán và điều trị. 
              <strong className="block mt-1">
                Lưu ý: Cuộc trò chuyện sẽ được lưu tự động và chỉ bị xóa khi bấm "Cuộc hội thoại mới" hoặc đăng xuất.
              </strong>
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <AlertTriangle size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Tuyên bố Miễn trừ Trách nhiệm Y khoa</h2>
                  <p className="text-white/90 text-sm mt-1">Vui lòng đọc kỹ trước khi sử dụng AI Doctor Advisor</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6 space-y-5 max-h-[500px] overflow-y-auto">
              <div className="space-y-4">
                {/* Warning 1 */}
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-red-900 dark:text-red-100 mb-1.5">
                        ⚠️ Công cụ hỗ trợ - KHÔNG thay thế quyết định lâm sàng
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        AI Doctor Advisor là công cụ hỗ trợ tham khảo, <strong>KHÔNG</strong> thay thế kiến thức chuyên môn, 
                        kinh nghiệm lâm sàng và khả năng ra quyết định y khoa của bác sĩ. Mọi chẩn đoán và điều trị 
                        cuối cùng phải dựa trên đánh giá lâm sàng trực tiếp của bác sĩ.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning 2 */}
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-orange-900 dark:text-orange-100 mb-1.5">
                        🔍 Trách nhiệm xác minh thông tin
                      </h3>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        Bác sĩ có trách nhiệm hoàn toàn trong việc xác minh, kiểm chứng tất cả thông tin được AI cung cấp 
                        với các nguồn tài liệu y khoa đáng tin cậy, hướng dẫn lâm sàng cập nhật (guidelines, protocols) 
                        và quy định pháp luật hiện hành. AI có thể đưa ra thông tin không chính xác hoặc lỗi thời.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning 3 */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-1.5">
                        💾 Dữ liệu lưu trữ tự động & Bảo mật
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Cuộc trò chuyện được lưu tự động trong trình duyệt (LocalStorage) để tiện theo dõi. 
                        Dữ liệu chỉ bị xóa khi bạn bấm "Cuộc hội thoại mới" hoặc đăng xuất. 
                        <strong className="block mt-1">Lưu ý:</strong> Không nhập thông tin bệnh nhân nhận dạng được 
                        (PII) vào chat để bảo vệ quyền riêng tư.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning 4 */}
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-purple-900 dark:text-purple-100 mb-1.5">
                        ⚖️ Trách nhiệm pháp lý
                      </h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Bác sĩ hoàn toàn chịu trách nhiệm pháp lý về các quyết định chẩn đoán, chỉ định điều trị 
                        và kê đơn thuốc. Hệ thống AI, nhà cung cấp và nhà phát triển 
                        <strong> KHÔNG chịu trách nhiệm pháp lý</strong> cho bất kỳ hậu quả y tế, pháp lý hoặc 
                        tài chính nào phát sinh từ việc sử dụng công cụ này.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Guidelines */}
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <FileText size={18} />
                    Khuyến cáo sử dụng:
                  </h4>
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                    <li>Sử dụng AI như một "second opinion" để tham khảo, không phải quyết định cuối cùng</li>
                    <li>Luôn kết hợp với khám lâm sàng trực tiếp và xét nghiệm cần thiết</li>
                    <li>Tham khảo ý kiến đồng nghiệp hoặc chuyên gia khi cần thiết</li>
                    <li>Cập nhật kiến thức y khoa thường xuyên để đánh giá chính xác thông tin AI</li>
                    <li>Tuân thủ các quy định về hành nghề y và đạo đức y khoa</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-5 mt-4">
                <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold text-center leading-relaxed">
                  ✓ Bằng cách nhấn <span className="text-green-600 dark:text-green-400">"Tôi đồng ý"</span>, 
                  bạn xác nhận rằng bạn đã đọc kỹ, hiểu rõ và chấp nhận toàn bộ các điều khoản, 
                  cảnh báo và trách nhiệm pháp lý nêu trên.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-4">
              <button
                onClick={() => {
                  setShowDisclaimer(false);
                  // Don't set accepted, so it will show again on next interaction
                }}
                className="px-8 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleAcceptDisclaimer}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 hover:shadow-lg transition-all font-semibold flex items-center gap-2"
              >
                <CheckCircle size={20} />
                Tôi đồng ý và chấp nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantPage;