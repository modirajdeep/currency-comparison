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
