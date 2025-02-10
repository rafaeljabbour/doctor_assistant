from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from audio import transcribe, getSymptoms, respond, resetHistory, firstQuestion

app = Flask(__name__)
CORS(app)

ORIGINAL_SYMPTOM_MESSAGES = [
    {"role": "system", "content": (
        "You are extracting symptoms from a hospital visit transcription."
        "Be as descriptive as possible on each symptom, categorizing them in one or two words."
        "Return a comma-separated list of symptoms including any and all previously meantioned symptoms."
        "If you have no symptoms to report, from this or any previous communication, respond with an empty string"
    )}
]
ORIGINAL_RESPONSE_MESSAGES = [
    {"role": "system", "content": (
        "You are a hospital pre-screening AI. You must ask targeted follow-up "
        "questions based on the patient’s symptoms to help doctors diagnose better. "
        "Do not repeat previous questions. Ask different things each time. If symptoms are unclear, "
        "probe for details (e.g., duration, severity, triggers). Keep responses brief and focused."
    )}
]
UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/upload', methods=['POST'])
def upload_audio():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        # Save uploaded audio file
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(file_path)

        # Process the file
        transcription = transcribe(file_path)
        symptoms = getSymptoms(transcription)  # Save to DB if needed
        print(symptoms)

        # Generate AI speech response
        output_filename = "response_" + file.filename.replace(".wav", ".mp3")
        audio_url = respond(transcription, output_filename)

        return jsonify({'url': audio_url}), 200

# Serve uploaded audio files
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/reset', methods=['POST'])
def reset_messages():
    """ Reset conversation history to the original system prompt """
    resetHistory()
    first_url = firstQuestion("first_question.mp3")
    return jsonify({"url": first_url}), 200

if __name__ == '__main__':
    app.run(debug=True)
