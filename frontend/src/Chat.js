import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './Chat.css';

const Chat = () => {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState(() => {
        const savedMessages = localStorage.getItem('chatMessages');
        return savedMessages ? JSON.parse(savedMessages) : [];
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isAiTyping, setIsAiTyping] = useState(false); // New state for AI typing indicator
    const [isAiSpeaking, setIsAiSpeaking] = useState(false); // New state for AI speaking indicator
    const [hasMicPermission, setHasMicPermission] = useState(null); // null: checking, true: granted, false: denied
    const [isClearing, setIsClearing] = useState(false); // New state for clear chat button loading
    const [isStoppingRecognition, setIsStoppingRecognition] = useState(false); // New state for stopping recognition
    const messagesEndRef = useRef(null);

    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);

    useEffect(() => {
        // Check for microphone permission
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
                setHasMicPermission(true);
            })
            .catch(() => {
                setHasMicPermission(false);
                console.warn("Microphone permission denied.");
            });

        // Initialize SpeechRecognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false; // Listen for a single utterance
            recognition.interimResults = false; // Only return final results
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (transcript.trim() === '') {
                    setMessages(prevMessages => [...prevMessages, { text: 'No speech detected. Please try again.', sender: 'system' }]);
                } else {
                    setPrompt(transcript);
                    // Automatically submit after speech recognition
                    handleSubmit(null, transcript);
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                let errorMessage = 'Speech recognition error.';
                if (event.error === 'not-allowed') {
                    errorMessage = 'Microphone access denied. Please enable it in your browser settings.';
                    setHasMicPermission(false);
                } else if (event.error === 'no-speech') {
                    errorMessage = 'No speech detected. Please try again.';
                } else if (event.error === 'audio-capture') {
                    errorMessage = 'Microphone not found or not working.';
                }
                setMessages(prevMessages => [...prevMessages, { text: errorMessage, sender: 'system' }]);
            };

            recognition.onend = () => {
                setIsListening(false);
                setIsStoppingRecognition(false); // Recognition has fully stopped
            };

            recognitionRef.current = recognition;
        } else {
            console.warn('Speech Recognition API not supported in this browser.');
            setHasMicPermission(false); // Assume no support means no mic access for this feature
        }

        // Hotkey activation for spacebar
        const handleKeyDown = (event) => {
            if (event.code === 'Space' && !isListening && !isLoading && document.activeElement.tagName !== 'INPUT') {
                event.preventDefault(); // Prevent spacebar from typing in input if not focused
                startListening();
            }
        };

        const handleKeyUp = (event) => {
            if (event.code === 'Space' && isListening) {
                recognitionRef.current?.stop();
                setIsStoppingRecognition(true); // Indicate that recognition is stopping
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isListening, isLoading, hasMicPermission]); // Dependencies for useEffect

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Save messages to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('chatMessages', JSON.stringify(messages));
    }, [messages]);

    const cleanMarkdown = (text) => {
        // Remove asterisks used for bold/italics/lists
        return text.replace(/\*/g, '').replace(/_/g, '');
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            // Optional: Provide visual feedback to the user that text has been copied
            console.log('Text copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    const speak = (text) => {
        if (synthRef.current) {
            const utterance = new SpeechSynthesisUtterance(cleanMarkdown(text));
            utterance.onstart = () => {
                setIsAiSpeaking(true);
            };
            utterance.onend = () => {
                setIsAiSpeaking(false);
            };
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event.error);
                setIsAiSpeaking(false);
            };
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
        setIsAiTyping(true); // Set AI typing indicator to true

        try {
            const response = await fetch('https://ai-web-voice-assistant.onrender.com/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: messageToSend }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let receivedText = '';
            let firstChunkReceived = false;

            // Add a new AI message placeholder
            setMessages(prevMessages => [...prevMessages, { text: '', sender: 'ai' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                receivedText += chunk;

                if (!firstChunkReceived) {
                    setIsAiTyping(false); // Hide typing indicator once first chunk arrives
                    firstChunkReceived = true;
                }

                // Update the last AI message with the new chunk
                setMessages(prevMessages => {
                    const newMessages = [...prevMessages];
                    newMessages[newMessages.length - 1].text = receivedText;
                    return newMessages;
                });

                // Speak the new chunk after cleaning Markdown
                speak(chunk);
            }

        } catch (error) {
            console.error("Failed to fetch from /ask endpoint:", error);
            const errorMessage = { text: 'Sorry, something went wrong. Please try again.', sender: 'ai' };
            setMessages(prevMessages => [...prevMessages, errorMessage]);
        } finally {
            setIsLoading(false);
            setIsAiTyping(false); // Ensure indicator is off on error or completion
        }
    };

    const handleClearChat = async () => {
        // Stop any ongoing speech synthesis
        if (synthRef.current && synthRef.current.speaking) {
            synthRef.current.cancel();
        }
        setIsClearing(true);
        try {
            const response = await fetch('https://ai-web-voice-assistant.onrender.com/clear', {
                method: 'POST',
            });
            if(response.ok) {
                setMessages([]);
                localStorage.removeItem('chatMessages'); // Also clear from local storage
            }
        } catch (error) {
            console.error("Failed to clear chat:", error);
        } finally {
            setIsClearing(false);
        }
    };

    const startListening = () => {
        if (hasMicPermission === false) {
            alert("Microphone access is denied. Please enable it in your browser settings to use voice input.");
            return;
        }
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in your browser. Please use Chrome or Edge.");
            return;
        }

        // Stop any ongoing speech synthesis
        if (synthRef.current && synthRef.current.speaking) {
            synthRef.current.cancel();
        }
        setPrompt(''); // Clear previous prompt
        setMessages(prevMessages => [...prevMessages, { text: 'Listening...', sender: 'system' }]);
        setIsListening(true);
        setIsStoppingRecognition(false); // Ensure this is false when starting
        recognitionRef.current.start();
    };

    return (
        <div className="chat-container">
            <div className="message-list">
                {messages.map((msg, index) => (
                    <div key={index} className={`message-wrapper ${msg.sender}`}>
                        {msg.sender === 'ai' && <div className="avatar ai-avatar"></div>}
                        <div className={`message ${msg.sender}`}>
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                            {msg.sender === 'ai' && (
                                <button className="copy-button" onClick={() => handleCopy(msg.text)} title="Copy to clipboard">
                                    📋
                                </button>
                            )}
                        </div>
                        {msg.sender === 'user' && <div className="avatar user-avatar"></div>}
                    </div>
                ))}
                {isAiTyping && (
                    <div className="message ai typing-indicator">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                    </div>
                )}
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
                <button type="button" onClick={startListening} disabled={isLoading || isListening || isStoppingRecognition || hasMicPermission === false} className="microphone-button">
                    {isListening ? (isStoppingRecognition ? 'Stopping...' : 'Stop Listening') : 'Start Listening'}
                </button>
                {hasMicPermission === false && (
                    <span style={{ color: 'red', marginLeft: '10px', fontSize: '0.8em' }}>Mic access denied!</span>
                )}
                {(isListening || isAiSpeaking) && (
                    <div className="voice-visualizer">
                        <div className="bar"></div>
                        <div className="bar"></div>
                        <div className="bar"></div>
                        <div className="bar"></div>
                        <div className="bar"></div>
                    </div>
                )}
            </form>
            <button onClick={handleClearChat} className="clear-chat-button" disabled={isClearing}>
                {isClearing ? 'Clearing...' : 'Clear Chat'}
            </button>
        </div>
    );
};

export default Chat;
