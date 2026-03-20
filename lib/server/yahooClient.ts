import YahooFinance from "yahoo-finance2";

let instance: InstanceType<typeof YahooFinance> | null = null;

export function getYahooFinance(): InstanceType<typeof YahooFinance> {
  if (!instance) {
    instance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
  }
  return instance;
}
