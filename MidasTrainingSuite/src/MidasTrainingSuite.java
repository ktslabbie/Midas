import java.io.File;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;

import util.Log;
import util.Util;
import util.Vars;

/**
 * @version		1.0
 * @since		May 17th, 2013
 */

/**
 * Main class.
 */
public class MidasTrainingSuite {

	private static double tradingFee = Vars.tradingFee*0.01 + Vars.slippageCorrection*0.01;
	private static double usdProfit = 0.0, usdMonthlyProfit = 0.0, btcProfit = 0.0, btcMonthlyProfit = 0.0;
	private static double prevUSD = 0.0, initUSD = 0.0, prevBTC = 0.0;
	private static double BTC = 0.0, USD = 0.0;

	private static double cumulativeUSDTradeLoss = 0.0, cumulativeUSDTradeGain = 0.0, cumulativeBTCTradeGain = 0.0, cumulativeBTCTradeLoss = 0.0;
	private static int numberOfTrades = 0, negativeTrades = 0, positiveTrades = 0;
	private static boolean logging = true;
	private static String monthlyLog = "";

	private static List<List<Tick>> multiTicks;

	/**
	 * Main method. Called without arguments - change parameters in the midas.properties file.
	 * 
	 * @param args
	 */
	public static void main(String[] args) {
		Log.getLogger().info("Starting program.");

		boolean valid = checkInputValidity();
		if(!valid) {
			Log.getLogger().error("Invalid input detected. Closing program.");
			return;
		}

		// Use US locale (for number formatting).
		Locale.setDefault(Locale.US);

		Log.getLogger().info("Parsing input files for " + Vars.NUMBER_OF_EMAS + " EMAs in path " + Vars.DATA_FILE_PATH + "...");
		multiTicks = parseInput(Vars.NUMBER_OF_EMAS, Vars.DATA_FILE_PATH);

		if(Vars.OPTIMIZATION) {
			optimizationMode();
		} else {
			start();
		}
	}

	/**
	 * Method to train the model; i.e. automatically optimize parameters.
	 * We run the training suite 4 times: first to find a rough indication for optimal parameters by testing with step = 0.4.
	 * Parameters are then refined by running the test suite twice more by halving the step to 0.2, 0.1 and 0.05, 
	 * with Min-Max thresholds re-set resp. to {current best parameters} - step, {current best parameters} + step.
	 */
	private static void optimizationMode() {

		Log.getLogger().info("Optimization mode enabled.");

		for (int i = 0; i < Vars.OPTIMIZATION_ROUNDS; i++) {
			Log.getLogger().info("");
			Log.getLogger().info("-----------------------------");
			Log.getLogger().info("Optimization step: " + Vars.step);
			Log.getLogger().info("-----------------------------");
			Log.getLogger().info("");

			start();

			updateStep(Vars.step / 2);
		}
	}

	/**
	 * Start testing and generate a report with results.
	 */
	private static void start() {

		if(Vars.TRAINING_SUITE || Vars.OPTIMIZATION) {
			trainingSuite(multiTicks);
		}

		logging = true;
		monthlyLog = "MONTHLY BREAKDOWN\n-----------------\n";

		double runProfit = process(multiTicks, Vars.startDate, Vars.endDate);

		String report = "\n\nREPORT\n" +
				"------\n" +
				"Total profit vs. start balance:\t\t" + format(2, runProfit) + "%\n" +
				"Total number of trades:\t\t\t" + numberOfTrades + "\n" + 
				"Profitable trades:\t\t\t" + positiveTrades + " (" + format(2, (double) positiveTrades / numberOfTrades * 100) + "%)\n" +
				"Unprofitable trades:\t\t\t" + negativeTrades + " (" + format(2, (double) negativeTrades / numberOfTrades * 100) + "%)\n" + 
				"Avg. USD profit in winning longs:\t" + format(2, cumulativeUSDTradeGain / positiveTrades) + "%\n" + 
				"Avg. USD loss in losing longs:\t\t" + format(2, cumulativeUSDTradeLoss / negativeTrades) + "%\n" +
				"Avg. BTC profit in winning shorts:\t" + format(2, cumulativeBTCTradeGain / positiveTrades) + "%\n" +
				"Avg. BTC loss in losing shorts:\t\t" + format(2, cumulativeBTCTradeLoss / negativeTrades) + "%\n" +
				"\n\n" + monthlyLog;

		Log.getLogger().info(report);
	}

	/**
	 * Check for input validity.
	 * TODO: validate all parameters
	 * 
	 * @return valid Input is valid or not.
	 */
	private static boolean checkInputValidity() {
		boolean valid = true;

		if(Vars.minEMAConfirmations > Vars.NUMBER_OF_EMAS) {
			Log.getLogger().error("minEMAConfirmations (" + Vars.minEMAConfirmations + ") cannot be higher than numberOfEMAs (" + Vars.NUMBER_OF_EMAS + ")!");
			valid = false;
		}

		return valid;
	}

	private static void trainingSuite(List<List<Tick>> multiTicks) {

		logging = false;

		Log.getLogger().info("Starting training suite.");

		// Matrix with start and end dates for each testing period.
		String[][] dateMatrix = new String[100][2];

		// Current position in the date matrix.
		int datePos = 0;

		// Initialize the ranking map.
		Map<String, Integer> ranking = initRanking();

		// Valid months to do testing in.
		String[] monthArray = new String[]{ 
				"2012 1/7",
				"2012 1/8", 
				"2012 1/9", 
				"2012 1/10", 
				"2012 1/11", 
				"2012 1/12", 
				"2013 1/1",
				"2013 1/2", 
				"2013 1/3", 
				"2013 1/4", 
				"2013 1/5", 
				"2013 1/6", 
				"2013 1/7", 
				"2013 1/8", 
				"2013 1/9" };

		// Initialize all valid p-month periods.
		for (int p = Vars.startXMonthPeriods; p <= Vars.endXMonthPeriods; p++) {
			for (int i = 0; i < monthArray.length-p; i++) {
				dateMatrix[datePos][0] = monthArray[i];
				dateMatrix[datePos][1] = monthArray[i+p];
				datePos++;
			}
		}

		for (int h = 0; h < datePos; h++) {

			// Ranking for the current period.
			// For simplicity, just store profit + parameters as a String and let Java take care of sorting. 
			SortedMap<Double, String> profitRanking = new TreeMap<Double, String>(java.util.Collections.reverseOrder());
			String startDate = dateMatrix[h][0];
			String endDate = dateMatrix[h][1];
			String period = startDate + " to " + endDate;

			Log.getLogger().info("Processing period " + period + "...");
			double progress = 0.0;
			double progressIncrement = 100 / ((Vars.emaBuyThresholdMax - Vars.emaBuyThresholdMin) / Vars.step);

			for (double i = Vars.emaBuyThresholdMin; i <= Vars.emaBuyThresholdMax; i += Vars.step) {
				Vars.emaBuyThreshold = round(2, i);
				Log.getLogger().info("Progress: " + format(1, progress) + "%");
				progress += progressIncrement;

				for (double j = Vars.emaSellThresholdMin; j <= Vars.emaSellThresholdMax; j += Vars.step) {
					Vars.emaSellThreshold = round(2, j);
					for (double k = Vars.ppoBuyCrossSpeedMin; k <= Vars.ppoBuyCrossSpeedMax; k += Vars.step) {
						Vars.ppoBuyCrossSpeed = round(2, k);
						for (double l = Vars.ppoSellCrossSpeedMin; l <= Vars.ppoSellCrossSpeedMax; l += Vars.step) {
							Vars.ppoSellCrossSpeed = round(2, l);
							for (double m = Vars.ppoBuySpeedMin; m <= Vars.ppoBuySpeedMax; m += Vars.step) {
								Vars.ppoBuySpeed = round(2, m);
								for (double n = Vars.ppoSellSpeedMin; n <= Vars.ppoSellSpeedMax; n += Vars.step) {
									Vars.ppoSellSpeed = round(2, n);
									for (double o = Vars.ppoBuyReboundSpeedMin; o <= Vars.ppoBuyReboundSpeedMax; o += Vars.step) {
										Vars.ppoBuyReboundSpeed = round(2, o);
										for (double p = Vars.ppoSellReboundSpeedMin; p <= Vars.ppoSellReboundSpeedMax; p += Vars.step) {
											Vars.ppoSellReboundSpeed = round(2, p);						

											double profit = process(multiTicks, startDate, endDate);

											// Ugly hack to work around maps only storing unique keys.
											while(profitRanking.containsKey(profit)) profit += 0.0000000001;

											profitRanking.put(profit, format(2, i) + " " + format(2, j) + " " + format(2, k) + " " + format(2, l) + 
													" " + format(2, m) + " " + format(2, n) + " " + format(2, o) + " " + format(2, p));
										}
									}
								}
							}
						}
					}
				}
			}

			String previousProfitString = "";
			int currentRank = 0;
			boolean skip = false;

			for (double profit : profitRanking.keySet()) {
				String currentProfitString = format(2, profit);
				int previousScore = ranking.get(profitRanking.get(profit));

				if(!currentProfitString.equals(previousProfitString)) currentRank++;
				ranking.put(profitRanking.get(profit), previousScore += currentRank);

				// Show trades corresponding to the highest ranked parameter combination by running process() again.
				if(currentRank == 1) {
					//Log.getLogger().info("profitRanking.get(profit): " + profitRanking.get(profit) + " profit: " + profit + " currentProfitString: " + currentProfitString + " previousProfitString: " + previousProfitString + " previousScore: " + previousScore);

					if(!skip) {
						Log.getLogger().info("Rank 1: " + profitRanking.get(profit) + ", yielding profit " + currentProfitString + "%. Current parameters' cumulative rank: " + ranking.get(profitRanking.get(profit)));
						Log.getLogger().info("Corresponding trades:");

						applyParameters(profitRanking.get(profit));
						logging = true;
						process(multiTicks, startDate, endDate);
						logging = false;

						skip = true;
					}
				}
				previousProfitString = currentProfitString;
			}
		}

		Log.getLogger().info("");
		Log.getLogger().info("Training finished!");

		ranking = Util.sortByValue(ranking);

		Log.getLogger().info("Ranking:");

		int count = 50;
		String bestParams = "";
		for (String params : ranking.keySet()) {
			Log.getLogger().info(params + ": " + ranking.get(params));
			if(count == 50) {
				applyParameters(params); // Apply the highest-ranked parameters so we can run a full test with them
				bestParams = params;
			}
			count--;
			if(count <= 0) break;
		}

		Log.getLogger().info("");
		Log.getLogger().info("Applying highest ranked parameters (" + bestParams + ") over the full period.");

		//return ranking;
	}

	/**
	 * Process the list of indicator ticks to figure out the total profit.
	 * 
	 * @param multiTicks the indicator ticks
	 * @param pStartDate the starting date
	 * @param pEndDate the ending date
	 * @return the profit of this run as a percentage of the input amount (i.e. startingAmount*2 = 100% profit, *3 = 200% profit, etc.)
	 */
	private static double process(List<List<Tick>> multiTicks, String pStartDate, String pEndDate) {
		Tick[] previousTicks = new Tick[4];
		boolean noEMABuy = false, noEMASell = false, ppoBought = false, ppoSold = false;
		numberOfTrades = 0; positiveTrades = 0; negativeTrades = 0;
		cumulativeUSDTradeLoss = 0.0; cumulativeUSDTradeGain = 0.0; cumulativeBTCTradeGain = 0.0; cumulativeBTCTradeLoss = 0.0;
		int tradeBlockCounter = -1;
		double tradeBlockBuyPrice = 0.0; boolean buyWatching = false, sellWatching = false;
		String currentMonth = "", newMonth = "", currentYear = "";
		int emaBuyConfirmations = 0;
		int emaSellConfirmations = 0;
		double price = 0.0;
		String date = "";

		prevUSD = 0.0; initUSD = Vars.STARTING_USD; prevBTC = 0.0;
		USD = Vars.STARTING_USD;
		BTC = Vars.STARTING_BTC;

		boolean skip = true;

		int timelineSize = multiTicks.get(0).size();

		for (int i = 0; i < timelineSize; i++) {
			for (int j = 0; j < Vars.NUMBER_OF_EMAS; j++) {
				List<Tick> ticks = multiTicks.get(j);

				if(ticks.size() <= i) continue;
				Tick tick = ticks.get(i);

				Tick previousTick = previousTicks[j];

				double previousPpo = 0.0;
				double previousEmaDiff = 0.0;
				double previousPpoDiff = 0.0;

				if(previousTick != null) {
					previousPpo = previousTick.getPpo();
					previousEmaDiff = previousTick.getEmaDiff();
					previousPpoDiff = previousTick.getPpoDiff();
				}

				previousTicks[j] = tick;

				double emaDiff = tick.getEmaDiff();
				double ppoDiff = tick.getPpoDiff();

				if(emaDiff > Vars.emaBuyThreshold && previousEmaDiff <= Vars.emaBuyThreshold) {
					emaBuyConfirmations++;
					if(emaBuyConfirmations >= Vars.NUMBER_OF_EMAS) ppoBought = false;
				} else if(emaDiff <= Vars.emaBuyThreshold  && previousEmaDiff > Vars.emaBuyThreshold) {
					emaBuyConfirmations--;
				}

				if(emaDiff < Vars.emaSellThreshold && previousEmaDiff >= Vars.emaSellThreshold) {
					emaSellConfirmations++;
					if(emaSellConfirmations >= Vars.NUMBER_OF_EMAS) ppoSold = false;
				} else if(emaDiff >= Vars.emaSellThreshold && previousEmaDiff < Vars.emaSellThreshold) {
					emaSellConfirmations--;
				}

				if(tick.getDate().contains(pStartDate)) skip = false;
				if(tick.getDate().contains(pEndDate)) skip = true;

				if(skip) continue;

				newMonth = tick.getDate().split("/")[1].split(" ")[0];
				currentYear = tick.getDate().split(" ")[0];

				if(!newMonth.equals(currentMonth)) {
					if(currentMonth != "") {
						double usdValue = (USD == 0.0) ? prevUSD : USD;

						if(logging) monthlyLog += "Profit for " + currentYear + " 1/" + currentMonth + " to 1/" + newMonth + "\tBTC: " + format(2, btcMonthlyProfit) + "%\tUSD: " + format(2, usdMonthlyProfit) + "%\t" +
								"Current BTC: " + format(2, BTC) + "\tCurrent USD (or USD value): $" + format(2, usdValue) + "\n";
					}
					currentMonth = newMonth;
					btcMonthlyProfit = 0.0;
					usdMonthlyProfit = 0.0;
				}

				date = tick.getDate();
				price = tick.getPrice();
				double ppo = tick.getPpo();
				
				if(sellWatching) {
					if(ppo < previousPpo  && (Math.abs(previousPpo - ppo) > Vars.ppoBuyReboundSpeed && previousPpo != 0.0) && USD > 0.0 && !noEMABuy) {
						tradeBlockCounter = -1;
					}
					
					if(tradeBlockCounter <= 0) {
						sellWatching = false;
					}
				}

				if(tradeBlockCounter == 0 && buyWatching) {

					if(price <= tradeBlockBuyPrice) {
						//Log.getLogger().info(date + ": Price $" + format(2, price) + " lower than buy-in price $" + format(2, tradeBlockBuyPrice) + "! Sell sell sell!");
						tradeBlockBuyPrice = 0.0;
					} else if(price > tradeBlockBuyPrice) {
						//Log.getLogger().info(date + ": Price $" + format(2, price) + " higher than previous price $" + format(2, tradeBlockBuyPrice) + "! Resetting trade block counter once again, sell next time.");
						tradeBlockCounter = Vars.NUMBER_OF_EMAS;
						tradeBlockBuyPrice = 0.0;
					}
					
					buyWatching = false;
				}

				if(tradeBlockCounter <= 0) {

					if(previousEmaDiff < 0 && emaDiff >= 0){
						noEMASell = false;
					} else if(previousEmaDiff >= 0 && emaDiff < 0){
						noEMABuy = false;
					}
					
					/*
					 * BUY case 3: Buy on unsustainable (PPO) fall, as a rebound is expected.
					 */
					if(ppo < previousPpo  && (Math.abs(previousPpo - ppo) > Vars.ppoBuyReboundSpeed && previousPpo != 0.0) && USD > 0.0 && !noEMABuy) {
						ppoSold = false;
						noEMASell = false;

						calculateBTCProfit(price);

						if(logging) Log.getLogger().info(date + ": EMA " + j + ".\tBuy " + format(5, (USD / price)*(1-tradingFee)) + " BTC at price\t$" + format(2, price) + 
								" for\tUSD $" + format(2, USD) + ".\tPPO fell too fast (-" + format(3, Math.abs(previousPpo - ppo)) + ").\tBTC Profit: " + format(2, btcProfit) + "%");

						buy(price);

						// Block trading for the other indicators to prevent immediate re-selling
						tradeBlockCounter = Vars.NUMBER_OF_EMAS;

						// Keep track of buy-in price
						tradeBlockBuyPrice = price;
						buyWatching = true;
					}

					/*
					 * SELL case 3: (Sell on unsustainable (PPO) rise, as a rebound is expected).
					 */
					else if(ppo > previousPpo && (Math.abs(previousPpo - ppo) > Vars.ppoSellReboundSpeed && previousPpo != 0.0) && BTC > 0.0 && !noEMASell) {
						ppoBought = false;
						noEMABuy = false;

						calculateUSDProfit(price);

						if(logging) Log.getLogger().info(date + ": EMA " + j + ".\tSell " + format(5, BTC) + " BTC at price\t$" + format(2, price) + 
								" for\tUSD $" + format(2, ((BTC * price)*(1-tradingFee))) + ".\tPPO rose too fast (" + format(3, Math.abs(previousPpo - ppo)) + ").\tUSD Profit: " + 
								format(2, usdProfit) + "%");

						sell(price);
						
						sellWatching = true;

						// Block trading for the other indicators to prevent immediate re-buying
						tradeBlockCounter = Vars.NUMBER_OF_EMAS;
					}

					/*
					 * BUY case 1: Standard EMA cross past buy threshold, provided this buy is currently allowed
					 * (i.e. if sold due to PPO cross or unsustainable fall, prevent this buy from executing the very next tick).
					 */
					else if(emaDiff >= Vars.emaBuyThreshold && emaBuyConfirmations >= Vars.minEMAConfirmations && USD > 0.0 && !noEMABuy) {
						ppoSold = false;

						calculateBTCProfit(price);

						if(logging) Log.getLogger().info(date + ": EMA " + j + ".\tBuy " + format(5, (USD / price)*(1-tradingFee)) + " BTC at price\t$" + format(2, price) + 
								" for\tUSD $" + format(2, USD) + ".\tEMA diff above " + Vars.emaBuyThreshold + ".\t\tBTC Profit: " + format(2, btcProfit) + "%");

						buy(price);
					}

					/*
					 * SELL case 1: Standard EMA cross past sell threshold, provided this sell is currently allowed 
					 * (i.e. if bought due to PPO cross or unsustainable rise, prevent this sell from executing the very next tick).
					 */
					else if(emaDiff <= Vars.emaSellThreshold && emaSellConfirmations >= Vars.minEMAConfirmations && BTC > 0.0 && !noEMASell) {
						ppoBought = false;

						calculateUSDProfit(price);

						if(logging) Log.getLogger().info(date + ": EMA " + j + ".\tSell " + format(5, BTC) + " BTC at price\t$" + format(2, price) + 
								" for\tUSD $" + format(2, ((BTC * price)*(1-tradingFee))) + ".\tEMA diff below " + Vars.emaSellThreshold + ".\t\tUSD Profit: " + 
								format(2, usdProfit) + "%");

						sell(price);
					}


					/*
					 * BUY case 2: A positive PPO cross faster than the minimum crossing speed (i.e. exceeding ppoBuyCrossSpeed)
					 */
					else if(previousPpoDiff != ppoDiff && (previousPpoDiff <= 0 && ppoDiff > 0) && Math.abs(previousPpo - ppo) > Vars.ppoBuyCrossSpeed && USD > 0.0) {
						if(emaDiff <= 0) noEMASell = true;	// Prevent selling the very next tick (EMA might still be in sell position)
						ppoBought = true;	// Flag for potential SELL case 2.5 trigger
						ppoSold = false;

						calculateBTCProfit(price);

						if(logging) Log.getLogger().info(date + ": EMA " + j + ".\tBuy " + format(5, (USD / price)*(1-tradingFee)) + " BTC at price\t$" + format(2, price) + 
								" for\tUSD $" + format(2, USD) + ".\tPPO cross at speed " + format(3, Math.abs(previousPpo - ppo)) + ".\tBTC Profit: " + format(2, btcProfit) + "%");

						buy(price);
					}

					/*
					 * BUY case 2.2: A PPO rise faster than the minimum rising speed (i.e. exceeding ppoBuySpeed). Only triggers if a positive cross has already occurred.
					 */
					else if(previousPpoDiff != ppoDiff && previousPpo < ppo && (previousPpoDiff > 0 && ppoDiff > 0) && Math.abs(previousPpo - ppo) > Vars.ppoBuySpeed && USD > 0.0) {
						if(emaDiff <= 0) noEMASell = true;	// Prevent selling the very next tick (EMA might still be in sell position)
						ppoBought = true;	// Flag for potential SELL case 2.5 trigger
						ppoSold = false;

						calculateBTCProfit(price);

						if(logging) Log.getLogger().info(date + ": EMA " + j + ".\tBuy " + format(5, (USD / price)*(1-tradingFee)) + " BTC at price\t$" + format(2, price) + 
								" for\tUSD $" + format(2, USD) + ".\tPPO rise at speed " + format(3, Math.abs(previousPpo - ppo)) + ".\tBTC Profit: " + format(2, btcProfit) + "%");

						buy(price);
					}

					/*
					 * SELL case 2.5 (Sell on PPO crossing negatively again while case 3 was in effect and EMA has not yet crossed into "buy" territory).
					 * This suggests a misprediction of an uptrend, so sell to cut losses.
					 */
					else if(previousPpoDiff != ppoDiff && (previousPpoDiff > 0 && ppoDiff <= 0) && ppoBought && emaDiff < Vars.emaBuyThreshold && BTC > 0.0) {
						ppoBought = false;

						calculateUSDProfit(price);

						if(logging) Log.getLogger().info(date + ": EMA " + j + ".\tSell " + format(5, BTC) + " BTC at price\t$" + format(2, price) + 
								" for\tUSD $" + format(2, (BTC * price)*(1-tradingFee)) + ".\tPPO re-cross.\t\t\tUSD Profit: " + 
								format(2, usdProfit) + "%");

						sell(price);
					}

					/*
					 * SELL case 2: A negative PPO cross faster than the minimum crossing speed (i.e. exceeding ppoSellCrossSpeed)
					 */
					else if(previousPpoDiff != ppoDiff && (previousPpoDiff > 0 && ppoDiff <= 0) && Math.abs(previousPpo - ppo) > Vars.ppoSellCrossSpeed && BTC > 0.0) {
						if(emaDiff >= 0) noEMABuy = true;	// Prevent buying the very next tick (EMA might still be in buy position)
						ppoSold = true;		// Flag for potential BUY case 2.5 trigger 
						ppoBought = false;

						calculateUSDProfit(price);

						if(logging) Log.getLogger().info(date + ": EMA " + j + ".\tSell " + format(5, BTC) + " BTC at price\t$" + format(2, price) + 
								" for\tUSD $" + format(2, (BTC * price)*(1-tradingFee)) + ".\tPPO cross at speed -" + format(3, Math.abs(previousPpo - ppo)) + ".\tUSD Profit: " + 
								format(2, usdProfit) + "%");

						sell(price);
					}

					/*
					 * SELL case 2.2: A PPO fall faster than the minimum falling speed (i.e. exceeding ppoSellSpeed). Only triggers if a negative cross has already occurred.
					 */
					else if(previousPpoDiff != ppoDiff && ppo < previousPpo && (previousPpoDiff <= 0 && ppoDiff <= 0) && Math.abs(previousPpo - ppo) > Vars.ppoSellSpeed && BTC > 0.0) {
						if(emaDiff >= 0) noEMABuy = true;	// Prevent buying the very next tick (if EMA is still in buy position)
						ppoSold = true;
						ppoBought = false;

						calculateUSDProfit(price);

						if(logging) Log.getLogger().info(date + ": EMA " + j + ".\tSell " + format(5, BTC) + " BTC at price\t$" + format(2, price) + 
								" for\tUSD $" + format(2, (BTC * price)*(1-tradingFee)) + ".\tPPO fall at speed -" + format(3, Math.abs(previousPpo - ppo)) + ".\tUSD Profit: " + 
								format(2, usdProfit) + "%");

						sell(price);
					}

					/*
					 * BUY case 2.5 (Buy on PPO crossing positively again while case 4 was in effect and EMA has not yet crossed into "sell" territory).
					 * This suggests a misprediction of a downtrend, so buy back in.
					 */
					else if(previousPpoDiff != ppoDiff && (previousPpoDiff <= 0 && ppoDiff > 0) && ppoSold && emaDiff > Vars.emaSellThreshold && USD > 0.0) {
						ppoSold = false;

						calculateBTCProfit(price);

						if(logging) Log.getLogger().info(date + ": EMA " + j + ".\tBuy " + format(5, (USD / price)*(1-tradingFee)) + " BTC at price\t$" + format(2,price) + 
								" for\tUSD $" + format(2, USD) + ".\tPPO re-cross.\t\t\tBTC Profit: " + format(2, btcProfit) + "%");

						buy(price);
					}
				}
				tradeBlockCounter--;
			}
		}

		if(USD == 0.0) {

			calculateUSDProfit(price);

			if(logging) Log.getLogger().info(date + " : End.\tSell " + format(5, BTC) + " BTC at price\t$" + format(2, price) + 
					" for\tUSD $" + format(2, ((BTC * price)*(1-tradingFee))) + ".\tSell for final USD.\t\tUSD Profit: " + 
					format(2, usdProfit) + "%");

			sell(price);
		}

		if(logging) monthlyLog += "Profit for " + currentYear + " 1/" + currentMonth + " to 1/" + (Integer.parseInt(newMonth) + 1) + "\tBTC: " + format(2, btcMonthlyProfit) + "%\tUSD: " + format(2, usdMonthlyProfit) + "%\t" +
				"Current BTC: " + format(2, BTC) + "\tFinal USD: $" + format(2, USD) + "\n";

		return (USD - initUSD) / initUSD * 100;
	}

	/**
	 * Calculate USD profit (in %) from selling BTC at current price compared to the previously held amount of USD.
	 * 
	 * @param price
	 */
	private static void calculateUSDProfit(double price) {
		usdProfit = ((BTC * price)*(1-tradingFee) - prevUSD) / prevUSD * 100;
		usdProfit = Double.isInfinite(usdProfit) ? 0.0 : usdProfit;
	}

	/**
	 * Calculate BTC profit (in %) from re-buying BTC at current price compared to the previously held amount of BTC.
	 * 
	 * @param price
	 */
	private static void calculateBTCProfit(double price) {
		btcProfit = ((USD / price)*(1-tradingFee) - prevBTC) / prevBTC * 100;
		btcProfit = Double.isInfinite(btcProfit) ? 0.0 : btcProfit;
	}

	/**
	 * Buy BTC with USD.
	 * 
	 * @param price Price to buy at
	 */
	private static void buy(double price) {
		if(btcProfit >= 0 && !Double.isInfinite(btcProfit)) {
			cumulativeBTCTradeGain += btcProfit;
			positiveTrades++;
		} else {
			cumulativeBTCTradeLoss += btcProfit;
			negativeTrades++;
		}

		btcMonthlyProfit += btcProfit;

		BTC += (USD / price)*(1-tradingFee);
		prevUSD = USD;
		USD = 0.0;
		numberOfTrades++;
	}

	/**
	 * Sell BTC for USD.
	 * 
	 * @param price Price to sell at
	 */
	private static void sell(double price) {
		if(usdProfit >= 0 && !Double.isInfinite(usdProfit)) {
			cumulativeUSDTradeGain += usdProfit;
			positiveTrades++;
		} else {
			cumulativeUSDTradeLoss += usdProfit;
			negativeTrades++;
		}

		usdMonthlyProfit += usdProfit;

		USD += (BTC * price)*(1-tradingFee);
		if(initUSD == 0.0) initUSD = USD;
		prevBTC = BTC;
		BTC = 0.0;
		numberOfTrades++;
	}

	/**
	 * Turn a space-separated parameter string into assigned global variables. 
	 * 
	 * @param parameters
	 */
	private static void applyParameters(String parameters) {
		String[] params = parameters.split(" ");
		Vars.emaBuyThreshold = Double.parseDouble(params[0]);
		Vars.emaSellThreshold = Double.parseDouble(params[1]); 
		Vars.ppoBuyCrossSpeed = Double.parseDouble(params[2]); 
		Vars.ppoSellCrossSpeed = Double.parseDouble(params[3]); 
		Vars.ppoBuySpeed = Double.parseDouble(params[4]); 
		Vars.ppoSellSpeed = Double.parseDouble(params[5]);
		Vars.ppoBuyReboundSpeed = Double.parseDouble(params[6]); 
		Vars.ppoSellReboundSpeed = Double.parseDouble(params[7]);
	}

	/**
	 * Update the current (best) parameters to -step Min and +step Max (for optimization mode).
	 * 
	 * @param step
	 */
	private static void updateStep(double step) {
		Vars.step = step;
		Vars.emaBuyThresholdMin = round(2, Vars.emaBuyThreshold - step); Vars.emaBuyThresholdMax = round(2, Vars.emaBuyThreshold + step);
		Vars.emaSellThresholdMin = round(2, Vars.emaSellThreshold - step); Vars.emaSellThresholdMax = round(2, Vars.emaSellThreshold + step);
		Vars.ppoBuyCrossSpeedMin = round(2, Vars.ppoBuyCrossSpeed - step); Vars.ppoBuyCrossSpeedMax = round(2, Vars.ppoBuyCrossSpeed + step);
		Vars.ppoSellCrossSpeedMin = round(2, Vars.ppoSellCrossSpeed - step); Vars.ppoSellCrossSpeedMax = round(2, Vars.ppoSellCrossSpeed + step);
		Vars.ppoBuySpeedMin = round(2, Vars.ppoBuySpeed - step); Vars.ppoBuySpeedMax = round(2, Vars.ppoBuySpeed + step);
		Vars.ppoSellSpeedMin = round(2, Vars.ppoSellSpeed - step); Vars.ppoSellSpeedMax = round(2, Vars.ppoSellSpeed + step);
		Vars.ppoBuyReboundSpeedMin = round(2, Vars.ppoBuyReboundSpeed - step); Vars.ppoBuyReboundSpeedMax = round(2, Vars.ppoBuyReboundSpeed + step);
		Vars.ppoSellReboundSpeedMin = round(2, Vars.ppoSellReboundSpeed - step); Vars.ppoSellReboundSpeedMax = round(2, Vars.ppoSellReboundSpeed + step);
	}

	/**
	 * Prepare the ranking map with all possible parameter combinations and initial scores of 0.
	 */
	private static Map<String, Integer> initRanking() {
		Log.getLogger().info("Initializing ranking map...");
		Map<String, Integer> ranking = new HashMap<String, Integer>();
		for (double i = Vars.emaBuyThresholdMin; i <= Vars.emaBuyThresholdMax; i += Vars.step)
			for (double j = Vars.emaSellThresholdMin; j <= Vars.emaSellThresholdMax; j += Vars.step)
				for (double k = Vars.ppoBuyCrossSpeedMin; k <= Vars.ppoBuyCrossSpeedMax; k += Vars.step)
					for (double l = Vars.ppoSellCrossSpeedMin; l <= Vars.ppoSellCrossSpeedMax; l += Vars.step)
						for (double m = Vars.ppoBuySpeedMin; m <= Vars.ppoBuySpeedMax; m += Vars.step)
							for (double n = Vars.ppoSellSpeedMin; n <= Vars.ppoSellSpeedMax; n += Vars.step)
								for (double o = Vars.ppoBuyReboundSpeedMin; o <= Vars.ppoBuyReboundSpeedMax; o += Vars.step)
									for (double p = Vars.ppoSellReboundSpeedMin; p <= Vars.ppoSellReboundSpeedMax; p += Vars.step)
										ranking.put(format(2, i) + " " + format(2, j) + " " + format(2, k) + " " + format(2, l) + 
												" " + format(2, m) + " " + format(2, n) + " " + format(2, o) + " " + format(2, p), 0);
		Log.getLogger().info("Initialized!");

		return ranking;
	}

	/**
	 * Parse input data files.
	 * 
	 * @param emaCount Number of EMAs, i.e. number of files to load
	 * @param dataFilePath Path where the data files are stored
	 * @return The data as lists of IndicatorTick objects
	 */
	private static List<List<Tick>> parseInput(int emaCount, String dataFilePath) {
		List<List<Tick>> emas = new ArrayList<List<Tick>>();
		File multiFile = new File(dataFilePath);

		for (int i = 0; i < emaCount; i++) {
			File file = multiFile.listFiles()[i];
			List<Tick> points = parseInput(file.getPath());
			emas.add(points);
		}

		return emas;
	}

	/**
	 * Parse input data file of space-seperated values (copy/pasted from the bot output in Chrome).
	 * 
	 * @param lines
	 * @return A list of IndicatorTick objects
	 */
	private static List<Tick> parseInput(String filePath) {
		String dataString = Util.readFile(filePath);
		String lines[] = dataString.split("\n");
		List<Tick> points = new ArrayList<Tick>();

		for (int i = lines.length-1; i > 0; i--) {

			String params[] = lines[i].split("\t");

			points.add(new Tick(params[0], 												// Date
					Double.parseDouble(params[1]), 										// Price
					Double.parseDouble(params[3]), 										// Long EMA
					Double.parseDouble(params[2]), 										// Short EMA
					Double.parseDouble(params[4].substring(0, params[4].length()-1)), 	// EMA difference (remove pesky % sign)
					Double.parseDouble(params[5]), 										// PPO line
					Double.parseDouble(params[6]), 										// Signal line
					Double.parseDouble(params[7])));									// PPO difference
		}

		return points;
	}
	
	/**
	 * Formats a number to a given amount of decimal places.
	 * 
	 * @param decs Decimal numbers to display
	 * @param number The number to format
	 * @return Formatted number String
	 */
	private static String format(int decs, double number) {
		return String.format("%." + decs + "f", number);
	}

	/**
	 * Rounds a double to a given amount of decimal places.
	 * 
	 * @param places Decimal numbers to round to
	 * @param value The number to round
	 * @return Rounded double
	 */

	public static double round(int places, double value) {
		if (places < 0) throw new IllegalArgumentException();

		BigDecimal bd = new BigDecimal(value);
		bd = bd.setScale(places, BigDecimal.ROUND_HALF_UP);
		return bd.doubleValue();
	}
}