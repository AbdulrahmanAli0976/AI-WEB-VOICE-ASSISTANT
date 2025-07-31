from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv

# --- Configuration ---
load_dotenv()
# It's recommended to use environment variables for sensitive data like API keys.
# Make sure you have GOOGLE_API_KEY set in your environment.
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
MODEL_NAME = 'gemini-1.5-flash-latest' # Or 'gemini-1.0-pro', 'gemini-1.5-pro-latest' etc.

# --- App Initialization ---
app = Flask(__name__)
# Allow all origins for now, but for production, you should restrict this
# to your frontend's domain. e.g., CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})
CORS(app)

# --- Gemini AI Setup ---
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable not set. Please set it before running the app.")

genai.configure(api_key=GOOGLE_API_KEY)

try:
    model = genai.GenerativeModel(MODEL_NAME)
    # Initialize chat history. This will be a simple in-memory store.
    # For a production app, you'd want to store this in a database.
    chat = model.start_chat(history=[])
except Exception as e:
    # Handle potential errors during model initialization (e.g., invalid API key)
    raise IOError(f"Failed to initialize the GenerativeModel. Error: {e}")


# --- API Endpoints ---
@app.route('/')
def home():
    """A simple endpoint to confirm the backend is running."""
    return "AI Web Voice Assistant backend is up and running!"

@app.route('/ask', methods=['POST'])
def ask():
    """Receives a prompt from the frontend and returns the AI's response."""
    data = request.get_json()
    if not data or 'prompt' not in data:
        return jsonify({"error": "Missing 'prompt' in request body."}), 400

    prompt = data.get("prompt")
    if not prompt:
        return jsonify({"response": "Please provide a prompt."}), 400

    try:
        # Send the user's message to the chat session and get the response
        response = chat.send_message(prompt)
        return jsonify({"response": response.text})
    except Exception as e:
        print(f"Gemini API Error: {e}")
        # It's good practice to return a generic error to the user
        return jsonify({"error": "Sorry, I couldn't process that request. An internal AI error occurred."}), 500

@app.route('/clear', methods=['POST'])
def clear_chat():
    """Clears the current conversation history."""
    global chat
    # Re-initialize the chat session
    chat = model.start_chat(history=[])
    return jsonify({"message": "Chat history cleared successfully."}), 200

@app.errorhandler(404)
def not_found(error):
    """Handles 404 Not Found errors."""
    return jsonify({"error": "Not Found. The requested URL was not found on the server."}), 404

# --- Main Execution ---
if __name__ == '__main__':
    # Use 0.0.0.0 to make the app accessible on your local network
    # The default port is 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
