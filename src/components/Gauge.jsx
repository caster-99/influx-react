import { useEffect, useState } from "react";
import { Chart as ChartJS, Title, Legend, ArcElement } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { StreamingPlugin } from "chartjs-plugin-streaming";
import { InfluxDB } from "@influxdata/influxdb-client";

const legendMarginPlugin = {
  id: "legendMargin",
  beforeInit: (chart) => {
    const originalFit = chart.legend.fit;

    chart.legend.fit = function () {
      originalFit.bind(chart.legend)();
      this.height += 20;
    };
  },
};
ChartJS.register(
  ArcElement,
  Title,
  Legend,
  legendMarginPlugin,
  StreamingPlugin
);
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

export const Gauge = () => {
  const options = {
    responsive: true,
    // Establecer el tamaño deseado para el gráfico
    maintainAspectRatio: false, // Esto permite ajustar el tamaño sin mantener la proporción
    width: 700, // Ancho en píxeles
    height: 400, // Alto en píxeles
    plugins: {
      title: {
        display: true,
        text: `Temperatura y Humedad `,
      },
    },
    backgroundColor: "white",
    cutout: "70%",
  };

  function getGradient(chart, type) {
    const {
      ctx,
      chartArea: { left, right },
    } = chart;
    const gradientSegment = ctx.createLinearGradient(left, 0, right, 0);
    if (type === "temperature") {
      gradientSegment.addColorStop(0, "#40B4E5"); //blue
      gradientSegment.addColorStop(0.5, "#FFC526"); //yellow
      gradientSegment.addColorStop(1, "#FF0000"); //red
    } else {
      gradientSegment.addColorStop(0, "#FF0000"); //red
      gradientSegment.addColorStop(0.5, "#FFC526"); //yellow
      gradientSegment.addColorStop(1, "#40B4E5"); //blue
    }
    return gradientSegment;
  }
  const [dataTemp, setDataTemp] = useState([]);
  const [dataHum, setDataHum] = useState([]);
  const [isData, setIsData] = useState(false);

  const temperatureValue = {
    id: `temperatureValue`,
    beforeDraw(chart) {
      const {
        ctx,
        chartArea: { left, top, width, height },
      } = chart;
      const temperatureLabel = `Temperatura: ${dataTemp[0]?.data[
        dataTemp[0]?.data.length - 1
      ].map((value) => value.y)}°C`;
      ctx.fillStyle = "black"; // Set the color for the label
      ctx.font = "bold 16px Arial"; // Set the font style for the label
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(temperatureLabel, left + width / 2, top + height - 80);
    },
  };

  const humidityValue = {
    id: `humidityValue`,
    beforeDraw(chart) {
      const {
        ctx,
        chartArea: { left, top, width, height },
      } = chart;
      const humidityLabel = `Humedad: ${dataHum[0]?.data[
        dataHum[0]?.data.length - 1
      ].map((value) => value.y)}%`;
      ctx.fillStyle = "black"; // Set the color for the label
      ctx.font = "bold 16px Arial"; // Set the font style for the label
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(humidityLabel, left + width / 2, top + height - 60);
    },
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
      setIsData(true);
    };
    const interval = setInterval(() => {
      influxQuery();
    }, 1000);
    return () => clearInterval(interval);
  }, [dataHum, dataTemp]);

  const dataSet = {
    labels: !isData
      ? dataTemp[0]?.data.map((value) => new Date(value.x).toLocaleString())
      : [],
    datasets: [
      {
        label: "Temperatura",
        //get data from the array of objects where the field is temperature.
        data: !isData
          ? [
              dataTemp[0]?.data[dataTemp[0]?.data.length - 1].map(
                (value) => value.y
              ),
              45 -
                dataTemp[0]?.data[dataTemp[0]?.data.length - 1].map(
                  (value) => value.y
                ),
            ]
          : [],
        circumference: 180,
        rotation: 270,
        borderWidth: 0,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { chartArea } = chart;
          if (!chartArea) {
            // This case happens on initial chart load
            return null;
          }
          if (context.dataIndex === 0) {
            return getGradient(chart, "temperature");
          } else {
            return "#FFFFFF";
          }
        },
        hoverOffset: 10,
      },
      {
        label: "Humedad",
        data: !isData
          ? [
              dataHum[0]?.data[dataHum[0]?.data.length - 1].map(
                (value) => value.y
              ),
              100 -
                dataHum[0]?.data[dataHum[0]?.data.length - 1].map(
                  (value) => value.y
                ),
            ]
          : [],
        backgroundColor: (context) => {
          const chart = context.chart;
          const { chartArea } = chart;
          if (!chartArea) {
            // This case happens on initial chart load
            return null;
          }

          if (context.dataIndex === 0) {
            return getGradient(chart, "humidity");
          } else {
            return "#FFFFFF";
          }
        },
        hoverOffset: -20,
      },
    ],
  };

  return <>{isData && <Doughnut data={dataSet} />}</>;
};
