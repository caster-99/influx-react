#include <Wire.h>
#include "DHT.h"
#include <InfluxDbClient.h>
#include <InfluxDbCloud.h>

#if defined(ESP32)
#include <WiFiMulti.h>
WiFiMulti wifiMulti;
#define DEVICE "ESP32"
#elif defined(ESP8266)
#include <ESP8266WiFiMulti.h>
ESP8266WiFiMulti wifiMulti;
#define DEVICE "ESP8266"
#endif

// Uncomment one of the lines below for whatever DHT sensor type you're using!
#define DHTTYPE DHT21  // DHT 21 (AM2301)
uint8_t DHTPin = 14;   // D5 pin on nodeMCU board, GPIO pin 14 - connected DATA from sensor

DHT dht(DHTPin, DHTTYPE);
// wifi
const char* ssid = "ABACANTVWIFI5B5F";
const char* password = "85047929266670";


#define INFLUXDB_URL "http://192.168.250.5:8086"
#define INFLUXDB_TOKEN "1wTeV_k8KZvHn0YDyXOcA71OEc991KhrVpA62f0IvKqDuN74Ev2pIJqmfDUV19WM5SrCpRngITcXAfQj6fWVIg=="
#define INFLUXDB_ORG "1bbe5f3a949fb99b"
#define INFLUXDB_BUCKET "ucontrol-arm21"

// Time zone info
#define TZ_INFO "UTC+4"

// Declare InfluxDB client instance with preconfigured InfluxCloud certificate
InfluxDBClient client(INFLUXDB_URL, INFLUXDB_ORG, INFLUXDB_BUCKET, INFLUXDB_TOKEN, InfluxDbCloud2CACert);

// Declare Data point
Point sensor("measurements");

float hum;   //Stores humidity value
float temp;  //Stores temperature value


/************* Connect to WiFi ***********/
void setup_wifi() {

  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  wifiMulti.addAP(ssid, password);
  Serial.print("Connecting to wifi");
  while (wifiMulti.run() != WL_CONNECTED) {
    Serial.print(".");
    delay(100);
  }
  Serial.println();
}


void setup() {
  Serial.begin(9600);
  setup_wifi();
  // Accurate time is necessary for certificate validation and writing in batches
  // We use the NTP servers in your area as provided by: https://www.pool.ntp.org/zone/
  // Syncing progress and the time will be printed to Serial.
  timeSync(TZ_INFO, "pool.ntp.org", "time.nis.gov");

  if (client.validateConnection()) {
    Serial.print("Connected to InfluxDB: ");
    Serial.println(client.getServerUrl());
  } else {
    Serial.print("InfluxDB connection failed: ");
    Serial.println(client.getLastErrorMessage());
  }
  sensor.addTag("device", DEVICE);
  sensor.addTag("SSID", WiFi.SSID());
  pinMode(DHTPin, INPUT);
  dht.begin();
}

void loop() {
  // Clear fields for reusing the point. Tags will remain the same as set above.
  sensor.clearFields();


  //Read data and store it to variables hum and temp
  hum = dht.readHumidity();
  temp = dht.readTemperature();

  // Store measured value into point
  sensor.addField("Temperature", temp);
  sensor.addField("Humidity", hum);

  // Print what are we exactly writing
  Serial.print("Writing: ");
  Serial.println(sensor.toLineProtocol());
  // Check WiFi connection and reconnect if needed
  if (wifiMulti.run() != WL_CONNECTED) {
    Serial.println("Wifi connection lost");
  }

  // Write point
  if (!client.writePoint(sensor)) {
    Serial.print("InfluxDB write failed: ");
    Serial.println(client.getLastErrorMessage());
  }

  delay(10000);
}
