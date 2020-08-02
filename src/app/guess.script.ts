declare function postMessage(message: any): void;

export const guessGross = ({ net, taxBrackets, hasExemption, worker }) => {
  const percent = val => {
    return (100 - val) / 100;
  };
  const calculateTotalTax = applicableAnnualGross => {
    const grossBrackets = [];
    let totalTaxPA = 0;
    taxBrackets.forEach((bracket, i) => {
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
  };
  let gross = 0;
  let totalTax = 0;
  let guessAdd = net / 100;
  let brackets = [];
  let netPlusTax = net;
  do {
    let { grossBrackets, totalTaxPA } = calculateTotalTax(gross);
    totalTax = totalTaxPA;
    brackets = grossBrackets;
    netPlusTax = net + totalTaxPA;
    if (guessAdd > 0.01 && gross + guessAdd >= netPlusTax) {
      guessAdd /= 3;
    }
    gross += guessAdd;
  } while (gross < netPlusTax);
  if (worker) {
    postMessage({ gross, totalTax, grossBrackets: brackets });
  }
};
