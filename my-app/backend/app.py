# app.py

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import requests  # To call the Node endpoints
from audio import transcribe, getSymptoms, respond, reset_history

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/upload', methods=['POST'])
def upload_audio():
    # Ensure a file is included in the request
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Save the uploaded audio file
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    # Process the file: transcription and symptom extraction
    transcription = transcribe(file_path)
    symptoms = getSymptoms(transcription)
    print("Extracted symptoms:", symptoms)

    # Determine the patient to update:
    # First, try to get a postId from the form data
    post_id = request.form.get('postId')
    if not post_id:
        # If no postId is provided, search for the patient with healthCard "1"
        try:
            search_endpoint = 'http://localhost:5001/api/posts/search'
            params = {'healthCard': '1'}
            search_response = requests.get(search_endpoint, params=params)
            print("Raw search response:", search_response.text)
            search_data = search_response.json()
            if (search_response.status_code == 200 and 
                search_data.get("success") and 
                search_data.get("patient")):
                patient = search_data["patient"]
                post_id = patient.get("postId")
                print("Found patient with healthCard 1, postId:", post_id)
            else:
                print("Patient with health card 1 not found or data not as expected.")
        except Exception as e:
            print("Error searching for patient with healthCard 1:", e)

    # If we now have a postId, call the Node endpoint to add symptoms
    if post_id:
        try:
            node_endpoint = 'http://localhost:5001/api/posts/add-symptoms'
            payload = {'postId': post_id, 'symptoms': symptoms}
            node_response = requests.post(node_endpoint, json=payload)
            print("Node server response:", node_response.text)
        except Exception as e:
            print("Error sending symptoms to Node server:", e)
    else:
        print("No postId available. Symptoms were not posted to any patient record.")

    # Generate an AI speech (TTS) response and return its URL
    output_filename = "response_" + file.filename.replace(".wav", ".mp3")
    audio_url = respond(transcription, output_filename)
    return jsonify({'url': audio_url}), 200

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/reset', methods=['POST'])
def reset_messages():
    reset_history()
    return jsonify({"message": "Conversation history reset"}), 200

if __name__ == '__main__':
    app.run(debug=True)
