import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, CornerDownRight, ChevronDown, ChevronUp } from 'lucide-react';

const AskQuasimatt = () => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [responses, setResponses] = useState({});
  const [newResponses, setNewResponses] = useState({});

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/questions');
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const fetchResponses = async (questionId) => {
    try {
      const response = await fetch(`/api/questions/${questionId}/responses`);
      const data = await response.json();
      setResponses(prev => ({ ...prev, [questionId]: data }));
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (newQuestion.trim() === '') return;
    
    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newQuestion })
      });
      if (response.ok) {
        setNewQuestion('');
        fetchQuestions();
      }
    } catch (error) {
      console.error('Error posting question:', error);
    }
  };

  const handleResponseSubmit = async (questionId) => {
    const responseText = newResponses[questionId];
    if (!responseText || responseText.trim() === '') return;

    try {
      const response = await fetch(`/api/questions/${questionId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: responseText })
      });
      if (response.ok) {
        setNewResponses(prev => ({ ...prev, [questionId]: '' }));
        fetchResponses(questionId);
      }
    } catch (error) {
      console.error('Error posting response:', error);
    }
  };

  const handleExpandQuestion = (questionId) => {
    if (expandedQuestion === questionId) {
      setExpandedQuestion(null);
    } else {
      setExpandedQuestion(questionId);
      if (!responses[questionId]) {
        fetchResponses(questionId);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center" style={{ color: '#ff007f' }}>Ask quasimatt</h1>
        
        <form onSubmit={handleQuestionSubmit} className="mb-8">
          <div className="flex border-b border-gray-700">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Ask quasimatt anything..."
              className="flex-grow p-3 bg-black text-white border-none focus:outline-none"
              style={{ '::placeholder': { color: '#666' } }}
            />
            <button 
              type="submit" 
              className="text-white p-3 transition duration-200"
              style={{ 
                backgroundColor: '#ff007f',
                ':hover': { backgroundColor: '#cc0066' }
              }}
            >
              <Send size={24} />
            </button>
          </div>
        </form>
        
        <div className="space-y-6">
          {questions.map((question) => (
            <div key={question.id} className="border-b border-gray-800 pb-4">
              <div className="flex items-start space-x-3">
                <MessageSquare size={24} style={{ color: '#ff007f' }} className="mt-1" />
                <div className="flex-grow">
                  <p className="text-white text-lg">{question.text}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(question.timestamp).toLocaleString()}
                  </p>
                  <button 
                    onClick={() => handleExpandQuestion(question.id)}
                    className="mt-2 flex items-center"
                    style={{ color: '#ff007f' }}
                  >
                    {expandedQuestion === question.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <span className="ml-1">
                      {responses[question.id] ? `${responses[question.id].length} responses` : 'Responses'}
                    </span>
                  </button>
                </div>
              </div>
              {expandedQuestion === question.id && (
                <div className="mt-4 ml-8 space-y-2">
                  {responses[question.id] && responses[question.id].map((response) => (
                    <div key={response.id} className="flex items-start space-x-2">
                      <CornerDownRight size={16} style={{ color: '#ff007f' }} className="mt-1" />
                      <div>
                        <p className="text-gray-300">{response.text}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(response.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="flex mt-2 border-b border-gray-700">
                    <input
                      type="text"
                      value={newResponses[question.id] || ''}
                      onChange={(e) => setNewResponses(prev => ({ ...prev, [question.id]: e.target.value }))}
                      placeholder="Add a response..."
                      className="flex-grow p-2 bg-black text-white border-none focus:outline-none"
                      style={{ '::placeholder': { color: '#666' } }}
                    />
                    <button
                      onClick={() => handleResponseSubmit(question.id)}
                      className="text-white p-2"
                      style={{ 
                        backgroundColor: '#ff007f',
                        ':hover': { backgroundColor: '#cc0066' }
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AskQuasimatt;
