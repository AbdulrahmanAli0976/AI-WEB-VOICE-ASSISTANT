const micBtn = document.getElementById('mic');
const responseBox = document.getElementById('response');
const chatbox = document.getElementById('chatbox');
const typingIndicator = document.getElementById('typing-indicator');

// Check for Web Speech API support for both recognition and synthesis
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    responseBox.textContent = "Speech recognition not supported in this browser. Please use Chrome or Edge.";
    micBtn.style.display = 'none'; // Hide mic icon
    document.querySelector('button[onclick="startListening()"]').style.display = 'none'; // Hide start button
}

// Check for SpeechSynthesis support
if (!('speechSynthesis' in window)) {
    console.error("Web Speech API (Synthesis) is NOT supported in this browser.");
    responseBox.textContent = "Text-to-speech (voice output) is not supported in this browser.";
    // You might want to visually indicate this to the user on the page
} else {
    console.log("Web Speech API (Synthesis) is supported.");
    // Force loading of voices, though onvoiceschanged is more reliable
    speechSynthesis.getVoices();
}


const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.interimResults = false; // Only final results
recognition.maxAlternatives = 1;    // Only the most likely result

// Event listener for mic icon click
micBtn.addEventListener('click', startListening);

// Function to append messages to the chatbox
function appendMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    if (sender === 'user') {
        messageDiv.classList.add('user-message');
    } else { // sender === 'bot'
        messageDiv.classList.add('bot-message');
    }
    messageDiv.textContent = text;
    chatbox.appendChild(messageDiv);
    chatbox.scrollTop = chatbox.scrollHeight; // Scroll to bottom
}

// Main function to start listening
function startListening() {
    responseBox.textContent = "Listening... 🎤";
    recognition.start();

    recognition.onstart = function() {
        responseBox.textContent = "Listening... Speak now! 🎤";
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        responseBox.textContent = "You said: " + transcript; // Show what user said in status box
        appendMessage('user', transcript); // Add to chat history
        getAIResponse(transcript);
    };

    recognition.onerror = function(event) {
        responseBox.textContent = "Error: " + event.error + ". Try again.";
        console.error("Speech Recognition Error:", event.error);
        typingIndicator.style.display = 'none';
    };

    recognition.onend = function() {
        // Recognition ended.
    };
}

// Function to send user input to the Flask backend
async function getAIResponse(userInput) {
    responseBox.textContent = "Thinking... 🤖";
    typingIndicator.style.display = 'block'; // Show typing indicator

    try {
        const response = await fetch('http://127.0.0.1:5000/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: userInput }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const aiText = data.response;

        typingIndicator.style.display = 'none'; // Hide typing indicator
        responseBox.textContent = "AI's Response:"; // Update status box
        appendMessage('bot', aiText); // Add AI response to chat history
        speakText(aiText); // Call text-to-speech

    } catch (error) {
        typingIndicator.style.display = 'none'; // Hide typing indicator
        responseBox.textContent = "Failed to get response from server. Check console for details.";
        console.error("Error communicating with backend:", error);
        appendMessage('bot', "Sorry, I couldn't connect to the AI.");
    }
}

// Function for text-to-speech with robust checks
function speakText(text) {
    console.log("Attempting to speak:", text); // Debug log 1: Confirm function is called
    const synth = window.speechSynthesis;

    if (!synth) {
        console.error("SpeechSynthesis API not available on window.speechSynthesis.");
        return;
    }

    // A common reason for speech not playing: voices not being loaded yet.
    // Ensure voices are loaded before attempting to speak.
    const voices = synth.getVoices();
    if (voices.length === 0) {
        console.warn("No voices loaded yet. Waiting for 'voiceschanged' event...");
        synth.onvoiceschanged = () => {
            console.log("Voices loaded. Retrying speak after 'voiceschanged'.");
            speakTextInternal(text); // Try again after voices are reported available
        };
        return; // Exit and wait for voiceschanged
    } else {
        console.log("Voices available:", voices.map(v => v.name)); // Log available voices
        speakTextInternal(text);
    }


    function speakTextInternal(textToSpeak) {
        if (synth.speaking) {
            console.log("Speech already in progress, cancelling previous speech.");
            synth.cancel(); // Stop any ongoing speech
        }

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Add event listeners to the utterance for debugging
        utterance.onstart = () => {
            console.log("Speech Utterance started.");
        };
        utterance.onend = () => {
            console.log("Speech Utterance finished."); // Debug log 2: Confirm speech completion
        };
        utterance.onerror = (event) => {
            console.error("SpeechSynthesisUtterance error during speaking:", event.error); // Debug log 3: Catch specific errors
            if (event.error === "synthesis-failed") {
                console.error("Possible reasons for 'synthesis-failed': No suitable voice, audio device issues, or browser restrictions.");
            }
        };

        try {
            synth.speak(utterance);
            console.log("synth.speak() called. Current speaking status:", synth.speaking); // Debug log 4: Confirm speak was attempted
        } catch (e) {
            console.error("Error calling synth.speak():", e);
        }
    }
}

// Function to clear chat history
function clearChat() {
    chatbox.innerHTML = ''; // Clears all messages in the chatbox
    responseBox.textContent = "Chat cleared. Ready to listen!"; // Reset status message
}