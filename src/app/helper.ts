import * as currencyFormatter from "currency-formatter";
import { CountryBracketData } from "./interface";
import { ChartOptions } from "chart.js";

const to = promise =>
  promise
    .then(data => {
      return [null, data];
    })
    .catch(err => [err]);

const handleError = (that, message, error) => {
  if (error) {
    console.error(error);
    that.snackBar.open(message, "", {
      duration: 600
    });
    return true;
  }
  return false;
};

const percent = val => (100 - val) / 100;

const round = (val, toPow = 2) =>
  (Math.round(((val + Number.EPSILON) * 10) ^ toPow) / 10) ^ toPow;

const allCountryData: { [key: string]: CountryBracketData } = {
  Netherlands: {
    name: "Netherlands",
    currencyCode: "EUR",
    taxBrackets: [
      { min: 0, max: 20384, tax: 36.65 },
      { min: 20385, max: 34300, tax: 38.1 },
      { min: 34301, max: 68507, tax: 38.1 },
      { min: 68508, max: Infinity, tax: 51.75 }
    ],
    ppp: 0.78,
    pppUpdated: "2019"
  },
  India: {
    name: "India",
    currencyCode: "INR",
    taxBrackets: [
      { min: 0, max: 250000, tax: 0 },
      { min: 250001, max: 500000, tax: 5 },
      { min: 500001, max: 750000, tax: 10 },
      { min: 750001, max: 1000000, tax: 15 },
      { min: 1000001, max: 1250000, tax: 20 },
      { min: 1250001, max: 1500000, tax: 25 },
      { min: 1500001, max: Infinity, tax: 30 }
    ],
    ppp: 21.21,
    pppUpdated: "2019"
  }
};

const formatCurrency = (value: number, code: string): string => {
  if (code == "INR") {
    let response = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR"
    }).format(value);
    if (response.substr(response.length - 2) == "00") {
      response = response.slice(0, -3);
    } else if (response.substr(response.length - 1) == "0") {
      response = response.slice(0, -1);
    }
    return response;
  }
  let options: any = {};
  if (code == "EUR") {
    options = {
      symbol: "€",
      decimal: ",",
      thousand: ".",
      format: "%v %s"
    };
  } else {
    options = { code };
  }
  return currencyFormatter.format(value, options);
};

const abbreviateCurrency = (num, code, fixed = 1) => {
  if (code == "INR") {
    const strArray = new Intl.NumberFormat("en-IN").format(num).split(",");
    const arrayLength = strArray.length;
    let result = strArray[0];
    if (arrayLength == 2) {
      result += "K";
    } else if (arrayLength == 3) {
      result += "L";
    } else if (arrayLength >= 4) {
      result += "Cr";
    }
    if (arrayLength > 4) {
      result = strArray.slice(-1 * arrayLength, -3).toString();
    }
    return result;
  }
  if (num === null) {
    return null;
  } // terminate early
  if (num === 0) {
    return "0";
  } // terminate early
  fixed = !fixed || fixed < 0 ? 0 : fixed; // number of decimal places to show
  var b = num.toPrecision(2).split("e"), // get power
    k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3), // floor at decimals, ceiling at trillions
    c =
      k < 1
        ? num.toFixed(0 + fixed)
        : (num / Math.pow(10, k * 3)).toFixed(1 + fixed), // divide by power
    d = c < 0 ? c : Math.abs(c), // enforce -0 is 0
    e = d + ["", "K", "M", "B", "T"][k]; // append power
  return e;
};

const ComparisonChartOptions: ChartOptions = {
  responsive: true,
  plugins: {
    datalabels: {
      anchor: "end",
      align: "end",
      formatter: value => abbreviateCurrency(value, this.toCurrency)
    }
  },
  legend: {
    position: "bottom"
  },
  tooltips: false,
  scales: {
    yAxes: [
      {
        gridLines: {
          drawBorder: false
        },
        ticks: {
          display: false
        }
      }
    ],
    xAxes: [
      {
        gridLines: {
          display: false
        },
        ticks: {
          display: false
        }
      }
    ]
  },
  hover: {
    axis: "y"
  }
};

const BracketsChartOptions = {
  responsive: true,
  plugins: {
    datalabels: {
      display: false
    }
  },
  legend: {
    position: "bottom"
  },
  tooltips: false,
};

export {
  to,
  percent,
  round,
  handleError,
  allCountryData,
  formatCurrency,
  abbreviateCurrency,
  ComparisonChartOptions,
  BracketsChartOptions
};
