import { Component } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { MatSnackBar } from "@angular/material/snack-bar";
import { delay, debounceTime } from "rxjs/internal/operators";
import { UiService } from "./ui.service";
import { WebworkerService } from "./webworker.service";
import { guessGross } from "./guess.script";
import { Observable, Subject } from "rxjs";
import {
  trigger,
  state,
  style,
  animate,
  transition
} from "@angular/animations";

import { ChartOptions, ChartType, ChartDataSets } from "chart.js";
import * as pluginDataLabels from "chartjs-plugin-datalabels";
import { Label } from "ng2-charts";

export interface Bracket {
  min: number;
  max: number;
  tax: number;
  taxableAmount?: number;
  taxedAmount?: number;
}

export interface CountryBracketData {
  name: string;
  currencyCode: string;
  taxBrackets: Bracket[];
  ppp: number;
  pppUpdated: string;
}

export interface ServerData {
  to: CountryBracketData;
  from: CountryBracketData;
}

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

const serverData = (selectedCountry, targetCountry): ServerData => {
  const response: ServerData = {
    to: allCountryData[targetCountry],
    from: allCountryData[selectedCountry]
  };
  return response;
};

@Component({
  selector: "my-app",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
  animations: [
    trigger("inOutAnimation", [
      transition(":enter", [
        style({ height: 0, opacity: 0 }),
        animate("250ms ease-out", style({ height: 35, opacity: 1 }))
      ]),
      transition(":leave", [
        style({ height: 35, opacity: 1 }),
        animate("250ms ease-in", style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class AppComponent {
  displayedColumns = ["bracket", "tax", "amount"];
  input = 850000; // before tax
  grossPA = 0; // before tax
  grossPM = 0; // before tax
  netPA = 0; // after tax
  netPM = 0; // after tax
  exchangedPA = 0;
  exchangedPM = 0;
  totalTaxPA = 0;
  totalTaxPM = 0;
  exemption = false;
  isInputPA = false;
  fromCountry = "India";
  toCountry = "Netherlands";
  fromCurrency = "";
  toCurrency = "";
  exchangeRate = 1;
  pppFrom = 1;
  pppTo = 1;
  toPPPPM = 0; // To Purchasing Power Parity Per Month
  fromPPPYear;
  toPPPYear;
  grossBrackets = [];
  panelOpenState = true;
  dc = "symbol"; // display currency
  dic = "1.0-2"; // display info currency
  countryOptions = ["India", "Netherlands"];
  serverData: ServerData;
  mode = "non";
  inputChanged = new Subject<string>();

  countryChange() {
    this.serverData = serverData(this.fromCountry, this.toCountry);
    this.fromCurrency = this.serverData.from.currencyCode;
    this.toCurrency = this.serverData.to.currencyCode;
    this.currencyChange();
  }

  handleSwap() {
    let fromCountry = this.fromCountry;
    this.fromCountry = this.toCountry;
    this.toCountry = fromCountry;
    this.countryChange();
  }

  modeChange({ value }) {
    this.mode = value;
    this.inputChange();
  }

  handleInputChange() {
    this.inputChanged.next();
  }

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private ui: UiService,
    private workerService: WebworkerService
  ) {}

  get yearToggleText() {
    return this.isInputPA ? "Yearly" : "Monthly";
  }

  ngOnInit() {
    this.inputChanged
      .pipe(debounceTime(250))
      .subscribe(() => this.inputChange());
    this.countryChange();
    this.refreshBrackets();
  }

  ngOnDestroy() {}

  percent(val) {
    return (100 - val) / 100;
  }

  round(val) {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  get hasExemption() {
    return this.exemption && this.fromCurrency == "EUR";
  }

  async inputChange(inputVal = this.input) {
    if (this.mode == "net") {
      if (this.isInputPA) {
        this.netPA = inputVal;
        this.netPM = inputVal / 12;
      } else {
        this.netPA = inputVal * 12;
        this.netPM = inputVal;
      }
      const [error, data] = await to(
        this.workerService.run(guessGross, {
          host: window.location.host,
          path: window.location.pathname,
          protocol: window.location.protocol,
          worker: true,
          net: this.netPA,
          taxBrackets: this.serverData.from.taxBrackets,
          hasExemption: this.hasExemption
        })
      );
      if (handleError(this, "Failed to calculate Gross!", error)) {
        return;
      }
      this.grossPA = data.gross;
      this.grossPM = this.grossPA / 12;
      this.totalTaxPA = data.totalTax;
      this.totalTaxPM = this.totalTaxPA / 12;
      this.grossBrackets = data.grossBrackets;
    } else {
      if (this.isInputPA) {
        this.grossPA = inputVal;
        this.grossPM = inputVal / 12;
      } else {
        this.grossPA = inputVal * 12;
        this.grossPM = inputVal;
      }
      let annualGross = this.grossPA;
      let applicableAnnualGross = annualGross;
      if (this.hasExemption) {
        applicableAnnualGross = 0.7 * applicableAnnualGross;
      }
      const grossBrackets = [];
      let totalTaxPA = 0;
      this.serverData.from.taxBrackets.forEach((bracket, i) => {
        if (applicableAnnualGross > bracket.max) {
          bracket["taxableAmount"] = bracket.max - bracket.min;
        } else if (
          applicableAnnualGross > bracket.min &&
          applicableAnnualGross <= bracket.max
        ) {
          bracket.taxableAmount = applicableAnnualGross - bracket.min;
        } else {
          bracket.taxableAmount = 0;
        }
        if (bracket.taxableAmount) {
          grossBrackets.push(bracket);
          bracket.taxedAmount =
            bracket.taxableAmount * (1 - this.percent(bracket.tax));
          totalTaxPA += bracket.taxedAmount;
        }
      });
      this.grossBrackets = grossBrackets;
      this.totalTaxPA = totalTaxPA;
      this.totalTaxPM = totalTaxPA / 12;
      this.netPA = annualGross - totalTaxPA;
      this.netPM = this.netPA / 12;
    }
    this.setComparison();
  }

  calculateTotalTax(applicableAnnualGross) {
    const grossBrackets = [];
    let totalTaxPA = 0;
    this.serverData.from.taxBrackets.forEach((bracket, i) => {
      if (applicableAnnualGross > bracket.max) {
        bracket["taxableAmount"] = bracket.max - bracket.min;
      } else if (
        applicableAnnualGross > bracket.min &&
        applicableAnnualGross <= bracket.max
      ) {
        bracket.taxableAmount = applicableAnnualGross - bracket.min;
      } else {
        bracket.taxableAmount = 0;
      }
      if (bracket.taxableAmount) {
        grossBrackets.push(bracket);
        bracket.taxedAmount =
          bracket.taxableAmount * (1 - this.percent(bracket.tax));
        totalTaxPA += bracket.taxedAmount;
      }
    });
    return { grossBrackets, totalTaxPA };
  }

  async currencyChange() {
    this.ui.spin$.next(true);
    const [error, exchangeData] = await to(this.getExchange());
    this.ui.spin$.next(false);
    if (handleError(this, "Can't load exchange rate!", error)) {
      return;
    }
    this.exchangeRate = exchangeData["rates"][this.toCurrency];
    this.refreshBrackets();
  }

  refreshBrackets() {
    this.inputChange();
  }

  getExchange() {
    const exchangeRateApiURI = `https://api.exchangeratesapi.io/latest?base=${
      this.fromCurrency
    }&symbols=${this.toCurrency}`;
    return this.http
      .get(exchangeRateApiURI)
      .pipe(delay(250))
      .toPromise();
  }

  get perData() {
    let PA, PM;
    switch (this.mode) {
      case "non":
        PA = this.grossPA;
        PM = this.grossPM;
        break;
      default:
        PA = this.netPA;
        PM = this.netPM;
    }
    return { PA, PM };
  }

  setComparison() {
    const { PA, PM } = this.perData;
    this.exchangedPA = PA * this.exchangeRate;
    this.exchangedPM = PM * this.exchangeRate;
    this.pppFrom = this.serverData.from.ppp;
    this.pppTo = this.serverData.to.ppp;
    this.fromPPPYear = this.serverData.from.pppUpdated;
    this.toPPPYear = this.serverData.to.pppUpdated;
    this.toPPPPM = (PM / this.pppFrom) * this.pppTo;
    this.setComparisionChart();
  }

  public barChartOptions: ChartOptions = {
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
          }
        }
      ]
    },
    hover: {
      axis: "y"
    }
  };
  public barChartLabels: Label[] = [];
  public barChartType: ChartType = "horizontalBar";
  public barChartLegend = true;
  public barChartPlugins = [pluginDataLabels];

  public barChartData: ChartDataSets[] = [];

  setComparisionChart() {
    const { PM } = this.perData;
    this.barChartLabels = [this.toCountry];
    this.barChartData = [
      {
        data: [this.round(this.exchangedPM)],
        label: "Exchange",
        backgroundColor: "#F8DE7E",
        hoverBackgroundColor: "#F8DE7E"
      },
      {
        data: [this.round(this.toPPPPM)],
        label: "PPP",
        backgroundColor: "#3CB371",
        hoverBackgroundColor: "#3CB371"
      }
    ];
  }
}
