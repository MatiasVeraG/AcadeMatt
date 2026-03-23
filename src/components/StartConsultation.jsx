import React, { useState } from 'react';
import { BookOpen, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const StartConsultation = ({ onConsultationCreated }) => {
  const { createConversation } = useAuth();
  const [subject, setSubject] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const suggestedTopics = [
    'Differential Calculus',
    'Linear Algebra',
    'Physics I',
    'Organic Chemistry',
    'Python Programming',
    'Statistics'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const conversationId = await createConversation(subject);
      onConsultationCreated(conversationId);
    } catch (error) {
      console.error('Error creando consulta:', error);
      alert('Error creating the consultation. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleTopicClick = (topic) => {
    setSubject(topic);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-academic-blue to-blue-700 rounded-full mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Start New Consultation
          </h2>
          <p className="text-gray-600">
            Describe your academic need and we will connect you with the best available tutor
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
              Which subject do you need help with?
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="E.g. Differential Calculus, Physics I, etc."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-academic-blue"
              disabled={isCreating}
            />
          </div>

          {/* Suggested Topics */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Or choose a common topic:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {suggestedTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => handleTopicClick(topic)}
                  disabled={isCreating}
                  className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-all text-left ${
                    subject === topic
                      ? 'border-academic-blue bg-blue-50 text-academic-blue'
                      : 'border-gray-200 hover:border-academic-blue hover:bg-gray-50'
                  } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{topic}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!subject.trim() || isCreating}
            className="w-full bg-gradient-to-r from-academic-blue to-blue-700 text-white px-6 py-4 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Looking for an available tutor...
              </>
            ) : (
              <>
                <MessageSquare className="w-5 h-5" />
                Start Consultation
              </>
            )}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">🤖 Smart System:</span> We use capacity-based assignment to connect you
            with the most available tutor, ensuring quick responses.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StartConsultation;

