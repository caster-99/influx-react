import React, { useState, useEffect } from "react";
import { InfluxDB } from "@influxdata/influxdb-client";

import { Bar } from "react-chartjs-2";
import "chartjs-adapter-luxon";
import Chart from "chart.js/auto";
import StreamingPlugin from "chartjs-plugin-streaming";

Chart.register(StreamingPlugin);

const token =
  "6MYx3wUjddL5KbNas8u4P-ieVg4oujjMDi7GCC_lSqLaLkhNKx9gP7e4bf2HaZQO1IybCwE1Gjjzc44bcINndw==";
const org = "UControl";
const url = "http://192.168.250.5:8086/";

let queryT = `from(bucket: "ucontrol-arm21") 
|>  range(start: -5m, stop: 1h) 
|> filter(fn: (r) => r["_measurement"] == "measurements")
|> filter(fn: (r) => r["SSID"] == "ABACANTVWIFI5B5F")
|> filter(fn: (r) =>  r["_field"] == "Temperature")
|> filter(fn: (r) => r["device"] == "ESP8266")
|> yield(name: "mean")`;

let queryH = `from(bucket: "ucontrol-arm21")
|>  range(start: -5m, stop: 1h)
|> filter(fn: (r) => r["_measurement"] == "measurements")
|> filter(fn: (r) => r["SSID"] == "ABACANTVWIFI5B5F")
|> filter(fn: (r) =>  r["_field"] == "Humidity")
|> filter(fn: (r) => r["device"] == "ESP8266")
|> yield(name: "mean")`;

export const BarChart = () => {
  const [dataTemp, setDataTemp] = useState([]);
  const [dataHum, setDataHum] = useState([]);

  const dataSet = {
    labels: dataTemp[0]?.data.map((value) =>
      new Date(value.x).toLocaleString()
    ),
    datasets: [
      {
        label: "Temperatura",
        //get data from the array of objects where the field is temperature.
        data: dataTemp[0]?.data.map((value) => value.y),
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
      {
        label: "Humedad",
        data: dataHum[0]?.data.map((value) => value.y),
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
    ],
  };

  useEffect(() => {
    let resT = [];
    let resH = [];
    const influxQuery = async () => {
      //create InfluxDB client
      const queryApi = new InfluxDB({ url, token }).getQueryApi(org);
      //make query
      await queryApi.queryRows(queryT, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          //push rows from query into an array object
          resT.push(o);
        },
        complete() {
          let finalData = [];

          //variable is used to track if the current ID already has a key
          var exists = false;

          //nested for loops aren't ideal, this could be optimized but gets the job done
          for (let i = 0; i < resT.length; i++) {
            for (let j = 0; j < finalData.length; j++) {
              //check if the sensor ID is already in the array, if true we want to add the current data point to the array
              if (resT[i]["sensor_id"] === finalData[j]["id"]) {
                exists = true;
                let point = {};
                point["x"] = resT[i]["_time"];
                point["y"] = resT[i]["_value"];
                finalData[j]["data"].push(point);
              }
            }
            //if the ID does not exist, create the key and append first data point to array
            if (!exists) {
              let d = {};
              d["id"] = resT[i]["sensor_id"];
              d["data"] = [];
              let point = {};
              point["x"] = resT[i]["_time"];
              point["y"] = resT[i]["_value"];
              d["data"].push(point);
              finalData.push(d);
            }
            //need to set this back to false
            exists = false;
          }

          setDataTemp(finalData);
        },
        error(error) {
          console.log("temp query failed- ", error);
        },
      });
      await queryApi.queryRows(queryH, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          //push rows from query into an array object
          resH.push(o);
        },
        complete() {
          let finalData = [];

          //variable is used to track if the current ID already has a key
          var exists = false;

          //nested for loops aren't ideal, this could be optimized but gets the job done
          for (let i = 0; i < resH.length; i++) {
            for (let j = 0; j < finalData.length; j++) {
              //check if the sensor ID is already in the array, if true we want to add the current data point to the array
              if (resH[i]["sensor_id"] === finalData[j]["id"]) {
                exists = true;
                let point = {};
                point["x"] = resH[i]["_time"];
                point["y"] = resH[i]["_value"];
                finalData[j]["data"].push(point);
              }
            }
            //if the ID does not exist, create the key and append first data point to array
            if (!exists) {
              let d = {};
              d["id"] = resH[i]["sensor_id"];
              d["data"] = [];
              let point = {};
              point["x"] = resH[i]["_time"];
              point["y"] = resH[i]["_value"];
              d["data"].push(point);
              finalData.push(d);
            }
            //need to set this back to false
            exists = false;
          }

          setDataHum(finalData);
        },
        error(error) {
          console.log("hum query failed- ", error);
        },
      });
    };
    const interval = setInterval(() => {
      influxQuery();
    }, 10000);
    return () => clearInterval(interval);
  }, [dataHum, dataTemp]);

  useEffect(() => {
    console.log(dataTemp);
    console.log(dataHum);
  }, [dataTemp, dataHum]);

  return (
    <div
      style={{
        width: "100%",
        height: "250px",
      }}
    >
      <Bar data={dataSet} updateMode="resize" width={3000} height={1500} />
    </div>
  );
};
