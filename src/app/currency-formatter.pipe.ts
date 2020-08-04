import { Pipe, PipeTransform } from "@angular/core";
import { formatCurrency } from "./helper";

@Pipe({ name: "currencyFormatter" })
export class CurrencyFormatterPipe implements PipeTransform {
  transform(value: number, code: string): string {
    return formatCurrency(value, code);
  }
}
