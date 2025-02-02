# audio.py

from openai import OpenAI
import os

# Load your OpenAI API key from the environment
OPENAI_API_KEY = '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'

UPLOAD_FOLDER = "uploads"  # Folder to store audio files
BASE_URL = "http://localhost:5000/uploads/"  # Base URL for TTS audio

# Original system prompts
ORIGINAL_SYMPTOM_MESSAGES = [
    {"role": "system", "content": "You are extracting symptoms from a hospital visit transcription. Return a comma-separated list of symptoms including all previously mentioned symptoms."}
]
ORIGINAL_RESPONSE_MESSAGES = [
    {"role": "system", "content": (
        "You are a hospital pre-screening AI. You must ask targeted follow-up "
        "questions based on the patient’s symptoms to help doctors diagnose better. "
        "Do not repeat previous questions. Ask different things each time. If symptoms are unclear, "
        "probe for details (e.g., duration, severity, triggers). Keep responses brief and focused."
    )}
]

symptom_messages = ORIGINAL_SYMPTOM_MESSAGES.copy()
response_messages = ORIGINAL_RESPONSE_MESSAGES.copy()

def reset_history():
    global symptom_messages, response_messages
    symptom_messages = ORIGINAL_SYMPTOM_MESSAGES.copy()
    response_messages = ORIGINAL_RESPONSE_MESSAGES.copy()

def transcribe(filepath) -> str:
    client = OpenAI(api_key=OPENAI_API_KEY)
    with open(filepath, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="json"
        )
    return transcription.text

def getSymptoms(transcription: str) -> str:
    client = OpenAI(api_key=OPENAI_API_KEY)
    symptom_messages.append({"role": "user", "content": transcription})
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=symptom_messages
    )
    # Append the assistant's response to maintain context
    symptom_messages.append({"role": "assistant", "content": completion.choices[0].message.content})
    return completion.choices[0].message.content

def respond(transcription: str, output_filename: str) -> str:
    client = OpenAI(api_key=OPENAI_API_KEY)
    response_messages.append({"role": "user", "content": transcription})
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=response_messages
    )
    response_messages.append({"role": "assistant", "content": completion.choices[0].message.content})
    
    # Save the AI response as an audio file using TTS
    speech_file_path = os.path.join(UPLOAD_FOLDER, output_filename)
    with client.audio.speech.with_streaming_response.create(
        model="tts-1",
        voice="coral",
        speed=1,
        input=completion.choices[0].message.content
    ) as response:
        response.stream_to_file(speech_file_path)
    
    return BASE_URL + output_filename
