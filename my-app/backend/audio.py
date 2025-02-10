from openai import OpenAI
import os

# Load API Key
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

UPLOAD_FOLDER = "uploads"  # Store all audio files in this directory
BASE_URL = "http://localhost:5000/uploads/"  # Access uploaded files via this URL

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
symptom_messages = ORIGINAL_SYMPTOM_MESSAGES.copy()
response_messages = ORIGINAL_RESPONSE_MESSAGES.copy()

def resetHistory():
    global symptom_messages, response_messages
    symptom_messages = ORIGINAL_SYMPTOM_MESSAGES.copy()
    response_messages = ORIGINAL_RESPONSE_MESSAGES.copy()

def firstQuestion(output_filename: str) -> str:
    client = OpenAI(api_key=OPENAI_API_KEY)
    speech_file_path = os.path.join(UPLOAD_FOLDER, output_filename)
    with client.audio.speech.with_streaming_response.create(
        model="tts-1",
        voice="coral",
        speed=1,
        input="Hello! I am a hospital pre-screening bot. Please describe your symptoms in detail and I will pass on the information to your doctor."
    ) as response:
        response.stream_to_file(speech_file_path)
    return BASE_URL + output_filename  # Return URL instead of relative path


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
    # Save the AI response as an audio file
    speech_file_path = os.path.join(UPLOAD_FOLDER, output_filename)
    
    with client.audio.speech.with_streaming_response.create(
        model="tts-1",
        voice="coral",
        speed=1,
        input=completion.choices[0].message.content
    ) as response:
        response.stream_to_file(speech_file_path)

    return BASE_URL + output_filename  # Return URL instead of relative path
