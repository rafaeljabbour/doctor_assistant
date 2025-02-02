#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <vector>
#include <algorithm>
#include <time.h>
#include <math.h>

//====================================
// WiFi and Backend Configuration
//====================================
const char *ssid = "Alinas iPhone";
const char *password = "gojeta98";

// Use the Railway HTTPS endpoints
const char *postsUrl = "https://utraesp32-server-production.up.railway.app/api/posts/all-posts";
const char *updateVisitUrl = "https://utraesp32-server-production.up.railway.app/api/posts/update-visit";
const char *addSymptomsUrl = "https://utraesp32-server-production.up.railway.app/api/posts/add-symptoms";

//====================================
// Robot Motor & Movement Configuration
//====================================
const int motor1pin1 = 27;
const int motor1pin2 = 26;
const int motor2pin1 = 32;
const int motor2pin2 = 33;

const int enA = 9;  // PWM pin for motor A
const int enB = 10; // PWM pin for motor B

const int speedA = 150; // (0-255)
const int speedB = 150; // (0-255)

const float ms_per_meter = 3226.0;       // milliseconds per meter (adjust as needed)
const unsigned long ms_turn_90 = 675;    // time in ms for a 90° turn
const unsigned long stopDuration = 5000; // pause time (in ms) after reaching a point

// PWM configuration for the enable pins
const int pwmFreq = 5000;
const int pwmResolution = 8;
const int pwmChannelA = 0;
const int pwmChannelB = 1;

// Robot’s current position (meters)
float currentX = 0.0;
float currentY = 0.0;

//====================================
// Active Patient Data Structure
//====================================
struct ActivePatient
{
  String userId;
  String firstName;
  String healthCard;
  String seatId;
  float x;
  float y;
  time_t registrationTime;
  int visitFlag; // 0 = not visited, 1 = being visited, 2 = visited
};

std::vector<ActivePatient> activeQueue;
bool robotBusy = false;       // flag to prevent overlapping movements
int currentPatientIndex = -1; // track patient currently being visited

//====================================
// Helper Prototypes
//====================================
String formatRegistrationTime(time_t regTime);
void fetchPosts();
void processPost(JsonObject post);
void goToPoint(float targetX, float targetY);
void moveForward(unsigned long duration);
void moveBackward(unsigned long duration);
void turnRight(unsigned long duration);
void turnLeft(unsigned long duration);
void stopMotors();
void updateVisitFlag(String healthCard, int flag);
void postSymptom();

//====================================
// Format Time for Debug Print
//====================================
String formatRegistrationTime(time_t regTime)
{
  char buf[16];
  struct tm timeinfo;
  localtime_r(&regTime, &timeinfo);
  strftime(buf, sizeof(buf), "%I:%M %p", &timeinfo);
  if (buf[0] == '0')
    return String(buf + 1);
  return String(buf);
}

//====================================
// Fetch Posts from the Backend
//====================================
void fetchPosts()
{
  WiFiClientSecure *client = new WiFiClientSecure;
  client->setInsecure(); // disable cert validation for testing

  HTTPClient http;
  http.begin(*client, postsUrl);
  int httpCode = http.GET();

  if (httpCode > 0)
  {
    if (httpCode == HTTP_CODE_OK)
    {
      String payload = http.getString();
      // Removed payload debug printing
      // Serial.println("\n--- Fetch Posts ---");
      // Serial.println(payload);

      const size_t capacity = 10240;
      DynamicJsonDocument doc(capacity);
      DeserializationError error = deserializeJson(doc, payload);
      if (error)
      {
        Serial.print("deserializeJson() failed: ");
        Serial.println(error.c_str());
        http.end();
        delete client;
        return;
      }

      JsonArray dataArray = doc["data"].as<JsonArray>();
      if (!dataArray.isNull())
      {
        for (JsonObject post : dataArray)
        {
          processPost(post);
        }
      }
      else
      {
        Serial.println("No 'data' array found in response.");
      }
    }
    else
    {
      Serial.print("HTTP GET failed, code: ");
      Serial.println(httpCode);
    }
  }
  else
  {
    Serial.print("HTTP GET error: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
  delete client;

  // Sort the activeQueue by registration time (earliest first)
  std::sort(activeQueue.begin(), activeQueue.end(), [](const ActivePatient &a, const ActivePatient &b)
            { return a.registrationTime < b.registrationTime; });

  // Debug: Print current active patients
  for (auto &patient : activeQueue)
  {
    Serial.print("Patient: ");
    Serial.print(patient.firstName);
    Serial.print(", Seat: ");
    Serial.print(patient.seatId);
    Serial.print(", Pos: (");
    Serial.print(patient.x, 2);
    Serial.print(", ");
    Serial.print(patient.y, 2);
    Serial.print("), Reg: ");
    Serial.print(formatRegistrationTime(patient.registrationTime));
    Serial.print(", VisitFlag: ");
    Serial.println(patient.visitFlag);
  }
}

//====================================
// Process a Single Post from the Backend
//====================================
void processPost(JsonObject post)
{
  const char *userIdC = post["userId"];
  String userId = userIdC ? String(userIdC) : "";
  const char *description = post["description"];
  if (!description)
    return;

  DynamicJsonDocument descDoc(1024);
  DeserializationError descErr = deserializeJson(descDoc, description);
  if (descErr)
  {
    Serial.print("Error parsing 'description': ");
    Serial.println(descErr.c_str());
    return;
  }

  String firstName = "";
  if (descDoc.containsKey("firstName"))
    firstName = String((const char *)descDoc["firstName"]);

  String seatId = "";
  if (descDoc.containsKey("seatId") && !descDoc["seatId"].isNull())
    seatId = String((const char *)descDoc["seatId"]);

  String healthCard = "";
  if (descDoc.containsKey("healthCard"))
    healthCard = String((const char *)descDoc["healthCard"]);

  JsonObject loc = descDoc["location"];
  float x = 0.0, y = 0.0;
  if (!loc.isNull())
  {
    x = loc["x"] | 0.0;
    y = loc["y"] | 0.0;
  }

  // Use current time as registrationTime (alternatively, parse createdAt if needed)
  time_t now = time(nullptr);

  // Search for this patient in activeQueue.
  bool found = false;
  for (auto it = activeQueue.begin(); it != activeQueue.end(); ++it)
  {
    if (it->userId == userId)
    {
      found = true;
      // If patient now has no seat, remove them.
      if (seatId == "")
      {
        Serial.print("Patient ");
        Serial.print(it->firstName);
        Serial.println(" left the chair. Removing from active queue.");
        activeQueue.erase(it);
      }
      else
      {
        // If seat changed or it’s a new day, update and reset visit flag.
        struct tm reg_tm, now_tm;
        localtime_r(&(it->registrationTime), &reg_tm);
        localtime_r(&now, &now_tm);
        if (it->seatId != seatId ||
            reg_tm.tm_mday != now_tm.tm_mday ||
            reg_tm.tm_mon != now_tm.tm_mon ||
            reg_tm.tm_year != now_tm.tm_year)
        {
          Serial.print("Updating patient ");
          Serial.println(firstName);
          it->seatId = seatId;
          it->registrationTime = now;
          it->visitFlag = 0;
        }
        it->firstName = firstName;
        it->x = x;
        it->y = y;
        it->healthCard = healthCard;
      }
      break;
    }
  }
  // Add new patient if not already in queue and seat is assigned.
  if (!found && seatId != "")
  {
    ActivePatient newPatient;
    newPatient.userId = userId;
    newPatient.firstName = firstName;
    newPatient.healthCard = healthCard;
    newPatient.seatId = seatId;
    newPatient.x = x;
    newPatient.y = y;
    newPatient.registrationTime = now;
    newPatient.visitFlag = 0;
    activeQueue.push_back(newPatient);
    Serial.print("New patient: ");
    Serial.print(firstName);
    Serial.print(", Seat: ");
    Serial.println(seatId);
  }
}

//====================================
// Robot Driving Logic Functions
//====================================
void goToPoint(float targetX, float targetY)
{
  float dx = targetX - currentX;
  float dy = targetY - currentY;

  Serial.print("Moving from (");
  Serial.print(currentX);
  Serial.print(", ");
  Serial.print(currentY);
  Serial.print(") to (");
  Serial.print(targetX);
  Serial.print(", ");
  Serial.print(targetY);
  Serial.println(")");

  // Move along Y axis (forward/backward)
  if (fabs(dy) > 0.001)
  {
    unsigned long duration = (unsigned long)(fabs(dy) * ms_per_meter);
    if (dy > 0)
      moveForward(duration);
    else
      moveBackward(duration);
  }

  // Move along X axis (lateral adjustment)
  if (fabs(dx) > 0.001)
  {
    unsigned long duration = (unsigned long)(fabs(dx) * ms_per_meter);
    if (dy >= 0)
    {
      if (dx > 0)
      {
        turnRight(ms_turn_90);
        moveForward(duration);
        turnLeft(ms_turn_90);
      }
      else
      {
        turnLeft(ms_turn_90);
        moveForward(duration);
        turnRight(ms_turn_90);
      }
    }
    else
    {
      if (dx > 0)
      {
        turnLeft(ms_turn_90);
        moveBackward(duration);
        turnRight(ms_turn_90);
      }
      else
      {
        turnRight(ms_turn_90);
        moveBackward(duration);
        turnLeft(ms_turn_90);
      }
    }
  }

  // Update current position and pause after arrival
  currentX = targetX;
  currentY = targetY;
  delay(stopDuration);
}

void moveForward(unsigned long duration)
{
  digitalWrite(motor1pin1, HIGH);
  digitalWrite(motor1pin2, LOW);
  digitalWrite(motor2pin1, HIGH);
  digitalWrite(motor2pin2, LOW);
  delay(duration);
  stopMotors();
}

void moveBackward(unsigned long duration)
{
  digitalWrite(motor1pin1, LOW);
  digitalWrite(motor1pin2, HIGH);
  digitalWrite(motor2pin1, LOW);
  digitalWrite(motor2pin2, HIGH);
  delay(duration);
  stopMotors();
}

void turnRight(unsigned long duration)
{
  digitalWrite(motor1pin1, HIGH);
  digitalWrite(motor1pin2, LOW);
  digitalWrite(motor2pin1, LOW);
  digitalWrite(motor2pin2, HIGH);
  delay(duration);
  stopMotors();
}

void turnLeft(unsigned long duration)
{
  digitalWrite(motor1pin1, LOW);
  digitalWrite(motor1pin2, HIGH);
  digitalWrite(motor2pin1, HIGH);
  digitalWrite(motor2pin2, LOW);
  delay(duration);
  stopMotors();
}

void stopMotors()
{
  digitalWrite(motor1pin1, LOW);
  digitalWrite(motor1pin2, LOW);
  digitalWrite(motor2pin1, LOW);
  digitalWrite(motor2pin2, LOW);
  delay(100);
}

//====================================
// Update Visit Flag on the Server
//====================================
void updateVisitFlag(String healthCard, int flag)
{
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.begin(client, updateVisitUrl);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(256);
  doc["healthCard"] = healthCard;
  doc["visitFlag"] = flag;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpResponseCode = http.POST(requestBody);
  if (httpResponseCode > 0)
  {
    Serial.print("updateVisit HTTP POST code: ");
    Serial.println(httpResponseCode);
    // Removed response payload printing
    // String payload = http.getString();
    // Serial.println("Response:");
    // Serial.println(payload);
  }
  else
  {
    Serial.print("Error on updateVisit POST: ");
    Serial.println(http.errorToString(httpResponseCode));
  }
  http.end();
}

//====================================
// Post Symptom Data (Example Function)
//====================================
void postSymptom()
{
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.begin(client, addSymptomsUrl);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(256);
  doc["healthCard"] = "3"; // sample value – replace as needed
  doc["symptoms"] = "test symptom";

  String requestBody;
  serializeJson(doc, requestBody);
  // Removed debug printing of request payload if desired
  // Serial.println("Posting symptom:");
  // Serial.println(requestBody);

  int httpResponseCode = http.POST(requestBody);
  if (httpResponseCode > 0)
  {
    Serial.print("postSymptom HTTP POST code: ");
    Serial.println(httpResponseCode);
    // Removed response payload printing
    // String payload = http.getString();
    // Serial.println("Response:");
    // Serial.println(payload);
  }
  else
  {
    Serial.print("Error on postSymptom POST: ");
    Serial.println(http.errorToString(httpResponseCode));
  }
  http.end();
}

//====================================
// Setup: WiFi, NTP, and Motor Pins
//====================================
void setup()
{
  Serial.begin(115200);
  delay(1000);

  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20)
  {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("WiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println("WiFi connection failed!");
  }

  // Configure NTP
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo))
  {
    Serial.println("Failed to obtain time");
  }
  else
  {
    char timeStr[16];
    strftime(timeStr, sizeof(timeStr), "%I:%M %p", &timeinfo);
    Serial.print("Current time: ");
    Serial.println(timeStr);
  }

  // Initialize motor control pins
  pinMode(motor1pin1, OUTPUT);
  pinMode(motor1pin2, OUTPUT);
  pinMode(motor2pin1, OUTPUT);
  pinMode(motor2pin2, OUTPUT);

  // Setup PWM channels for motor enable pins
  ledcSetup(pwmChannelA, pwmFreq, pwmResolution);
  ledcSetup(pwmChannelB, pwmFreq, pwmResolution);
  ledcAttachPin(enA, pwmChannelA);
  ledcAttachPin(enB, pwmChannelB);
  ledcWrite(pwmChannelA, speedA);
  ledcWrite(pwmChannelB, speedB);
}

//====================================
// Main Loop: Fetch Posts & Guide Robot
//====================================
void loop()
{
  if (WiFi.status() == WL_CONNECTED)
  {
    fetchPosts();
  }
  else
  {
    Serial.println("WiFi not connected");
  }

  // Robot navigation: visit patients sequentially.
  if (!robotBusy && !activeQueue.empty())
  {
    // Ensure the queue is sorted by registration time.
    std::sort(activeQueue.begin(), activeQueue.end(), [](const ActivePatient &a, const ActivePatient &b)
              { return a.registrationTime < b.registrationTime; });

    // If a patient was being visited previously, mark it as visited (flag 2) and remove from queue.
    if (currentPatientIndex != -1 && activeQueue[currentPatientIndex].visitFlag == 1)
    {
      updateVisitFlag(activeQueue[currentPatientIndex].healthCard, 2);
      activeQueue[currentPatientIndex].visitFlag = 2;
      activeQueue.erase(activeQueue.begin() + currentPatientIndex);
      currentPatientIndex = -1;
    }

    // Find next patient with visitFlag == 0.
    int nextIndex = -1;
    for (int i = 0; i < activeQueue.size(); i++)
    {
      if (activeQueue[i].visitFlag == 0)
      {
        nextIndex = i;
        break;
      }
    }

    if (nextIndex != -1)
    {
      // Mark the next patient as being visited (1) and update on the server.
      activeQueue[nextIndex].visitFlag = 1;
      updateVisitFlag(activeQueue[nextIndex].healthCard, 1);
      currentPatientIndex = nextIndex;

      robotBusy = true;
      // Drive the robot to the patient's chair.
      goToPoint(activeQueue[nextIndex].x, activeQueue[nextIndex].y);
      // Wait 20 seconds at the destination.
      delay(20000);
      // Mark this patient as visited (2).
      updateVisitFlag(activeQueue[currentPatientIndex].healthCard, 2);
      activeQueue[currentPatientIndex].visitFlag = 2;
      // Remove visited patient from the active queue.
      activeQueue.erase(activeQueue.begin() + currentPatientIndex);
      currentPatientIndex = -1;
      robotBusy = false;
    }
    else
    {
      Serial.println("No unvisited patient available.");
    }
  }
  else
  {
    Serial.println("Robot busy or active queue empty.");
  }

  Serial.println("\n -------------------------------- \n");

  delay(5000); // Wait before next loop iteration
}