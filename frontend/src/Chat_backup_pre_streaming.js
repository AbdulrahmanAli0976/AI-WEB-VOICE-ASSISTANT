import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';

const Chat = () => {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef(null);

    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);

    useEffect(() => {
        // Initialize SpeechRecognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false; // Listen for a single utterance
            recognition.interimResults = false; // Only return final results
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setPrompt(transcript);
                // Automatically submit after speech recognition
                handleSubmit(null, transcript);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        } else {
            console.warn('Speech Recognition API not supported in this browser.');
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const speak = (text) => {
        if (synthRef.current) {
            const utterance = new SpeechSynthesisUtterance(text);
            synthRef.current.speak(utterance);
        }
    };

    const handleSubmit = async (e, transcript = null) => {
        if (e) e.preventDefault();
        const messageToSend = transcript || prompt;
        if (!messageToSend.trim() || isLoading) return;

        const userMessage = { text: messageToSend, sender: 'user' };
        setMessages(prevMessages => [...prevMessages, userMessage]);
        setPrompt('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:5000/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: messageToSend }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const aiMessage = { text: data.response, sender: 'ai' };
            setMessages(prevMessages => [...prevMessages, aiMessage]);
            speak(data.response); // Speak the AI's response

        } catch (error) {
            console.error("Failed to fetch from /ask endpoint:", error);
            const errorMessage = { text: 'Sorry, something went wrong. Please try again.', sender: 'ai' };
            setMessages(prevMessages => [...prevMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = async () => {
        // Stop any ongoing speech synthesis
        if (synthRef.current && synthRef.current.speaking) {
            synthRef.current.cancel();
        }
        try {
            const response = await fetch('http://localhost:5000/clear', {
                method: 'POST',
            });
            if(response.ok) {
                setMessages([]);
            }
        } catch (error) {
            console.error("Failed to clear chat:", error);
        }
    };

    const startListening = () => {
        if (recognitionRef.current) {
            // Stop any ongoing speech synthesis
            if (synthRef.current && synthRef.current.speaking) {
                synthRef.current.cancel();
            }
            setPrompt(''); // Clear previous prompt
            setMessages(prevMessages => [...prevMessages, { text: 'Listening...', sender: 'system' }]);
            setIsListening(true);
            recognitionRef.current.start();
        } else {
            alert("Speech recognition is not supported in your browser. Please use Chrome or Edge.");
        }
    };

    return (
        <div className="chat-container">
            <div className="message-list">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        <p>{msg.text}</p>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="message-form">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
                    disabled={isLoading || isListening}
                />
                <button type="submit" disabled={isLoading || isListening}>
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
                <button type="button" onClick={startListening} disabled={isListening || isLoading} className="microphone-button">
                    {isListening ? 'Stop Listening' : 'Start Listening'}
                </button>
            </form>
            <button onClick={handleClearChat} className="clear-chat-button">Clear Chat</button>
        </div>
    );
};

export default Chat;
