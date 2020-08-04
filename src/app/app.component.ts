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

import {
  to,
  percent,
  round,
  handleError,
  allCountryData,
  formatCurrency,
  abbreviateCurrency,
  ComparisonChartOptions,
  BracketsChartOptions
} from "./helper";

import { ServerData } from "./interface";

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
        bracket.taxedAmount =
          bracket.taxableAmount * (1 - percent(bracket.tax));
        if (bracket.taxedAmount > 5) {
          grossBrackets.push(bracket);
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
          bracket.taxableAmount * (1 - percent(bracket.tax));
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
    this.setComparisonChart();
    this.setBracketsChart();
  }

  public chartPlugins = [pluginDataLabels];
  public comparisonChartOptions = ComparisonChartOptions;
  public comparisonChartLabels: Label[] = [];
  public comparisonChartData: ChartDataSets[] = [];
  public bracketsChartOptions = BracketsChartOptions;
  public bracketsChartLabels: Label[] = [];
  public bracketsChartData: ChartDataSets[] = [];
  public bracketsChartColors = [];

  setComparisonChart() {
    const { PM } = this.perData;
    this.comparisonChartLabels = [this.toCountry];
    this.comparisonChartData = [
      {
        data: [round(this.exchangedPM)],
        label: "Exchange",
        backgroundColor: "#F8DE7E",
        hoverBackgroundColor: "#F8DE7E"
      },
      {
        data: [round(this.toPPPPM)],
        label: "PPP",
        backgroundColor: "#3CB371",
        hoverBackgroundColor: "#3CB371"
      }
    ];
  }

  setBracketsChart() {
    // const percentColors = [
    //   { pct: 0.0, color: { r: 0xff, g: 0x00, b: 0 } },
    //   { pct: 0.5, color: { r: 0xff, g: 0xff, b: 0 } },
    //   { pct: 1.0, color: { r: 0x00, g: 0xff, b: 0 } }
    // ];
    const percentColors = [
      { pct: 0.0, color: { r: 255, g: 236, b: 179 } },
      { pct: 0.45, color: { r: 232, g: 82, b: 133 } },
      { pct: 0.65, color: { r: 106, g: 27, b: 154 } },
      { pct: 1, color: { r: 0, g: 0, b: 0 } }
    ];
    const getColorForPercentage = pct => {
      for (var i = 1; i < percentColors.length - 1; i++) {
        if (pct < percentColors[i].pct) {
          break;
        }
      }
      var lower = percentColors[i - 1];
      var upper = percentColors[i];
      var range = upper.pct - lower.pct;
      var rangePct = (pct - lower.pct) / range;
      var pctLower = 1 - rangePct;
      var pctUpper = rangePct;
      var color = {
        r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
        g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
        b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper)
      };
      return `rgb(${[color.r, color.g, color.b].join(",")})`;
    };
    const { PM } = this.perData;
    let bracketsChartLabels = [],
      bracketsChartData = [],
      colors = [];
    const grossBracketsLength = this.grossBrackets.length;
    this.grossBrackets.forEach((bracketData, index) => {
      bracketsChartLabels.push(
        `${abbreviateCurrency(
          bracketData.min,
          this.fromCurrency
        )} to ${abbreviateCurrency(bracketData.max, this.fromCurrency)}`
      );
      bracketsChartData.push(round(bracketData.taxedAmount));
      colors.push(getColorForPercentage(index / grossBracketsLength));
    });
    this.bracketsChartLabels = bracketsChartLabels;
    this.bracketsChartData = bracketsChartData;
    this.bracketsChartColors = [
      {
        backgroundColor: colors,
        hoverBackgroundColor: colors
      }
    ];
  }
}
