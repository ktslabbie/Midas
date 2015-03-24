/**
 * @author Kristian Slabbekoorn
 * 
 * Midas: a machine learning-based trading bot for Bitcoin. It was made to work with the (now defunct) Mt. Gox bitcoin exchange.
 * This is the background script for the Chrome plugin, and contains the meat of the bot.
 * The training of parameters for the bot is performed in a separate project (MidasTrainingSuite).
 * 
 * Originally forked from: https://github.com/TobbeLino/GoxTradingBotTobli
 * which was forked from: https://github.com/virtimus/GoxTradingBot
 */

const MtGoxAPI2BaseURL = 'https://data.mtgox.com/api/2/';
const useAPIv2 = true;

// Logfile name doesn't matter, it will be obscured by Chrome anyway.
// Location in Windows 7: C:\Users\{userName}\AppData\Local\Google\Chrome\User Data\Default\File System
var logFile = "log_.txt";
var writing = false;
var history = "";

var ApiKey = localStorage.ApiKey || '';
var ApiSec = localStorage.ApiSec || '';

var tradingDisabledOnStart = (localStorage.tradingDisabledOnStart || 1);
var tradingEnabled = (tradingDisabledOnStart ? 0 : (localStorage.tradingEnabled || 0));

var tradingIntervalMinutes = parseInt(localStorage.tradingIntervalMinutes || 60);
var globalMinutesShift = parseInt(localStorage.globalMinutesShift || 0);

var LogLines = parseInt(localStorage.LogLines || 1440);
var EmaShortPar = parseInt(localStorage.EmaShortPar || 10);
var EmaLongPar = parseInt(localStorage.EmaLongPar || 21);

var numberOfEMAs = parseInt(localStorage.numberOfEMAs || 4);
var adjustedTradingIntervalMinutes = parseInt(localStorage.adjustedTradingIntervalMinutes || tradingIntervalMinutes / numberOfEMAs);
var MaxSamplesToKeep = parseInt(localStorage.MaxSamplesToKeep || 336 * numberOfEMAs + numberOfEMAs); // 2810

const MaxTradingIntervalMinutes = 1440;
var minEMAConfirmations = parseInt(localStorage.minEMAConfirmations || 4);

var PPOEmaShortPar = parseInt(localStorage.PPOEmaShortPar || 12);
var PPOEmaLongPar = parseInt(localStorage.PPOEmaLongPar || 26);
var PPOSignalPar = parseInt(localStorage.PPOSignalPar || 9);

var MinBuyThreshold = parseFloat(localStorage.MinBuyThreshold || 0.00);
var MinSellThreshold = parseFloat(localStorage.MinSellThreshold || -0.70);

var MinBuyCrossSpeed = parseFloat(localStorage.MinBuyCrossSpeed || 0.75);
var MinSellCrossSpeed = parseFloat(localStorage.MinSellCrossSpeed || 0.5);

var MinBuySpeed = parseFloat(localStorage.MinBuySpeed || 1.90);
var MinSellSpeed = parseFloat(localStorage.MinSellSpeed || 1.40);

var MinBuyReboundSpeed = parseFloat(localStorage.MinBuyReboundSpeed || 1.30);
var MinSellReboundSpeed = parseFloat(localStorage.MinSellReboundSpeed || 1.70);

var currency = localStorage.currency || 'USD'; 					// Fiat currency to trade with
var keepFiat = parseFloat(localStorage.keepFiat || 0.0); 		// this amount in Fiat will be untouched by trade - bot will play with the rest
var keepBTC = parseFloat(localStorage.keepBTC || 0.0); 			// this amount in BTC will be untouched by trade - bot will play with the rest

var BTC = Number.NaN;
var fiat = Number.NaN;
var VirtualBTC = parseFloat(localStorage.VirtualBTC || 10.0);
var VirtualFiat = parseFloat(localStorage.VirtualFiat || 0.0);
var tradingFee = 0.006;

var utimer = null;
var bootstrap = 1; 		// Progress bar for loading initial H1 data from Mt. Gox
var synched = false; 	// Check whether synced to update only on full minutes yet

var priceArray = []; 	// The H1/H2/H4 etc. opening price data
var timeInMinutes = [];
var indicators = [];

var noEMABuy = false;
var noEMASell = false;
var ppoBought = false;
var ppoSold = false;

var emaBuyConfirmations  = 0;
var emaSellConfirmations = 0;

var tradeBlockCounter = -1;
var tradeBlockBuyPrice = 0.0;
var buyWatching = false;
var sellWatching = false;

var logWindow = null;
var logString = "";

var state = "limbo";

var popupRefresh = null;
var popupUpdateCounter = null;
var updateInProgress = false;
var abortUpdateAndRedo = false;
var retrying = false;

// Helper for storing log files to disk (in Chrome cache).
var filer = new Filer();

/**
 * Function to pad times with leading zeroes.
 * 
 * @param d
 * @returns leading 0 if a time less than 10.
 */
function padIt(d) { return d < 10 ? '0' + d.toString() : d.toString(); }

/**
 * Function to update the EMAs and PPOs.
 * 
 * @param pIndicators The array of time-lagged indicators to update.
 */
function updateEMAs(pIndicators) {
	var kEMAShort = 2 / (EmaShortPar + 1);
	var kEMALong = 2 / (EmaLongPar + 1);
	var kPPOShort = 2 / (PPOEmaShortPar + 1);
	var kPPOLong = 2 / (PPOEmaLongPar + 1);
	var kSignal = 2 / (PPOSignalPar + 1);

	// Calculate the indicator until the current price.
	while (pIndicators.length < priceArray.length) {

		// There are still points to calculate. Where are we now?
		var currentLength = pIndicators.length;
		
		// If we haven't even created this indicator yet, initialize it.
		if (pIndicators.length < numberOfEMAs) {
			
			// Initial tick is just the price at this point in time with 0 values.
			var indicatorTick = { 
					emaShort: priceArray[currentLength],
					emaLong: priceArray[currentLength],
					macdShort: priceArray[currentLength],
					macdLong: priceArray[currentLength],
					ppo: 0,
					signal: 0,
					emaDiff: 0,
					ppoDiff: 0, };
			pIndicators.push(indicatorTick);

		} else {
			
			// Update the indicators given the new price.
			// They need to be updated in regard to their own time-shifted version: hence we subtract the number of time-shifted EMAs that we have.
			var indicatorTick = { 
					emaShort: priceArray[currentLength]*kEMAShort + pIndicators[currentLength - numberOfEMAs].emaShort * (1-kEMAShort),
					emaLong: priceArray[currentLength]*kEMALong + pIndicators[currentLength - numberOfEMAs].emaLong * (1-kEMALong),
					macdShort: priceArray[currentLength]*kPPOShort + pIndicators[currentLength - numberOfEMAs].macdShort * (1-kPPOShort),
					macdLong: priceArray[currentLength]*kPPOLong + pIndicators[currentLength - numberOfEMAs].macdLong * (1-kPPOLong),
					ppo: null,
					signal: null,
					emaDiff: null,
					ppoDiff: null, };
			
			// Since these values are dependent on the EMA and PPO lines, we need to update them after creating the initial EMA/PPO tick.
			// PPO is the normalized MACD. MACD is the difference between its long and short EMA lines.
			indicatorTick.ppo = (indicatorTick.macdShort - indicatorTick.macdLong) / indicatorTick.macdLong * 100;
			
			// The PPO signal line.
			indicatorTick.signal = indicatorTick.ppo * kSignal + pIndicators[currentLength - numberOfEMAs].signal * (1-kSignal);
			
			// The current difference between EMA lines.
			indicatorTick.emaDiff = 100 * (indicatorTick.emaShort - indicatorTick.emaLong) / ( (indicatorTick.emaShort + indicatorTick.emaLong) / 2);
			
			// The current difference between the PPO and its signal line.
			indicatorTick.ppoDiff = indicatorTick.ppo - indicatorTick.signal;

			// Finally, add the completed compound indicator.
			pIndicators.push(indicatorTick);
		}
	}
}

/**
 * Update the account balance after a certain timeout.
 * 
 * @param t the timeout
 */
function scheduleBalanceUpdate(t) {
	if (utimer) clearTimeout();
	utimer = setTimeout(updateBalance, t);
}

/**
 * Fetch the latest BTC and fiat balances from Mt. Gox and update the UI.
 */
function updateBalance() {
	if (ApiKey=='') {
		// No API key. No use trying to fetch info.
		BTC = Number.NaN;
		fiat = Number.NaN;
		chrome.browserAction.setTitle({title: "No API key."});
		return;
	}

	var path;
	if (useAPIv2) 	path = "BTC" + currency + "/money/info";
	else 			path = "info.php";

	// Make a POST request to Mt. Gox to update the balance.
	mtGoxPost(path, [],
			
		function(e) {
			console.log("Error getting account balance. Retrying after 10 seconds...");
			chrome.browserAction.setTitle({title: "Error getting user info. MtGox problem?"});
			scheduleBalanceUpdate(10*1000);
		},
		
		function(d) {
			try {
				var jsonData = JSON.parse(d.currentTarget.responseText);
				if (useAPIv2) jsonData = jsonData.data;
	
				if (typeof(jsonData.Wallets[currency].Balance.value) == "undefined") {
					log("Error fetching account balance: " + jsonData.error);
					chrome.browserAction.setTitle({title: "Error getting balance. Mt. Gox problem?"});
				} else {
					BTC = parseFloat(jsonData.Wallets.BTC.Balance.value);
					fiat = parseFloat(jsonData.Wallets[currency].Balance.value);
					chrome.browserAction.setTitle({ title: (BTC.toFixed(3) + " BTC + " + fiat.toFixed(2) + " " + currency) });
					refreshPopup(true);
				}
			} catch (e) {
				console.log(e);
				chrome.browserAction.setTitle({title: "Exception parsing user info. MtGox problem?"});
			}
			
			// Update the balance every 5 minutes.
			scheduleBalanceUpdate(5*60*1000);
		}
	);
}

/**
 * Function to calculate the HMAC.
 * 
 * @param message
 * @param secret
 * @returns the HMAC
 */
function hmac_512(message, secret) {
	var shaObj = new jsSHA(message, "TEXT");
	var hmac = shaObj.getHMAC(secret, "B64", "SHA-512", "B64");
	return hmac;
}

/**
 * Function the make an Ajax POST request to Mt. Gox.
 * 
 * @param path The API path
 * @param params The parameters to send (JSON format)
 * @param ef onError function
 * @param df onLoad function
 */
function mtGoxPost(path, params, ef, df) {
	var req = new XMLHttpRequest();
	req.open("POST", (useAPIv2 ? MtGoxAPI2BaseURL : "https://mtgox.com/api/0/") + path, true);
	req.onerror = ef;
	req.onload = df;
	
	var data = "nonce=" + ((new Date()).getTime()*1000);
	for (var i in params) data += "&" + params[i];
	data = encodeURI(data);
	
	var	hmac = hmac_512((useAPIv2 ? path + '\0' + data : data), ApiSec);
	req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	req.setRequestHeader("Rest-Key", ApiKey);
	req.setRequestHeader("Rest-Sign", hmac);
	req.send(data);
}

function dateToDay(ms) {
	var t = new Date(ms);
	var y = t.getUTCFullYear().toString();
	var m = (t.getUTCMonth()+1).toString();
	var d = t.getUTCDate().toString();
	if (m.length<2) m = '0' + m;
	if (d.length<2) d = '0' + d;
	return y + "-" + m + "-" + d;
}

/**
 * Function to refresh the EMA.
 * Logic whether to buy or sell is contained here too.
 * 
 * @param reset true to reset our data
 */
function refreshEMA(reset) {
	if (reset) {
		log("Reset EMA data (EMA/Thresholds/Interval has changed)...");
		indicators = [];
	}

	if (priceArray.length == 0) {
		log("Error: priceArray not loaded!");
	} else if (priceArray.length > MaxSamplesToKeep) {
		
		// We have more ticker points than we intended to keep, so remove the oldest ones we don't need.
		var skip = priceArray.length - MaxSamplesToKeep;
		priceArray = priceArray.slice(skip);
		timeInMinutes = timeInMinutes.slice(skip);
		indicators = indicators.slice(skip);
	}

	// Update the EMAs given the new price data.
	updateEMAs(indicators);
	
	var price = priceArray[priceArray.length-1];

	// The difference between EMA differences between ticks.
	var emaDiff = indicators[indicators.length - 1].emaDiff;
	var previousEmaDiff = (indicators.length <= numberOfEMAs) ? 0 : indicators[indicators.length - (1 + numberOfEMAs)].emaDiff;

	// The difference between PPO differences between ticks.
	var ppoDiff = indicators[indicators.length - 1].ppoDiff;
	var previousPpoDiff = (indicators.length <= numberOfEMAs) ? 0 : indicators[indicators.length - (1 + numberOfEMAs)].ppoDiff;

	// Amount the PPO line has moved vertically between ticks (we call it "speed").
	var ppo = indicators[indicators.length - 1].ppo;
	var previousPpo = (indicators.length <= numberOfEMAs) ? 0 : indicators[indicators.length - (1 + numberOfEMAs)].ppo;
	var ppoSpeed = Math.abs(previousPpo - ppo);
	
	// Last minute recorded vs. the current time.
	var lastMinuteFetch = timeInMinutes[timeInMinutes.length - 1];
	var minuteNow = parseInt((new Date()).getTime()/60000);

	// If we're not yet in the present, disable trading!
	if (lastMinuteFetch < minuteNow - adjustedTradingIntervalMinutes) {
		tradingEnabled = 0;
	} else {
		chrome.browserAction.setBadgeText( { text: Math.abs(emaDiff).toFixed(2), } );
	}
	
	// Calculate the number of time-shifted EMAs that have crossed positively (BuyConf) or negatively (SellConf).
	if(indicators.length <= numberOfEMAs && MinSellThreshold >= 0) emaSellConfirmations++;
	if(indicators.length <= numberOfEMAs && MinBuyThreshold < 0) emaBuyConfirmations++;
	
	if(emaDiff > MinBuyThreshold && previousEmaDiff <= MinBuyThreshold) {
		emaBuyConfirmations++;
		if(emaBuyConfirmations >= numberOfEMAs) ppoBought = false;
	} else if(emaDiff <= MinBuyThreshold  && previousEmaDiff > MinBuyThreshold) {
		emaBuyConfirmations--;
	}

	if(emaDiff < MinSellThreshold && previousEmaDiff >= MinSellThreshold) {
		emaSellConfirmations++;
		if(emaSellConfirmations >= numberOfEMAs) ppoSold = false;
	} else if(emaDiff >= MinSellThreshold && previousEmaDiff < MinSellThreshold) {
		emaSellConfirmations--;
	}
	
	// Get the date for logging purposes.
	var d = new Date(lastMinuteFetch*60*1000);
	var date = d.getFullYear() + " " + d.getDate() + "/" + (d.getMonth() + 1) + " " + padIt(d.getHours()) + ":"+padIt(d.getMinutes());
	
	// If we're waiting until we can buy again after a SELL case 3...
	if(sellWatching) {
		if(ppo < previousPpo && (ppoSpeed > MinBuyReboundSpeed && previousPpo != 0.0) && !noEMABuy && state.indexOf("BUY") == -1)
			tradeBlockCounter = -1;
		
		if(tradeBlockCounter <= 0)
			sellWatching = false;
	}

	//If we're waiting until we can sell again after a BUY case 3...
	if(tradeBlockCounter == 0 && buyWatching) {

		if(price <= tradeBlockBuyPrice) {
			log(date + ": Price $" + round(price, 2) + " lower than buy-in price $" + round(tradeBlockBuyPrice, 2) + ". Sell now (unless another buy triggers).");
			tradeBlockBuyPrice = 0.0;
		} else if(price > tradeBlockBuyPrice) {
			log(date + ": Price $" + round(price, 2) + " higher than buy-in price $" + round(tradeBlockBuyPrice, 2) + ". Sell in 1 sample interval (unless another buy triggers).");
			
			tradeBlockCounter = numberOfEMAs;
			tradeBlockBuyPrice = 0.0;
		}
		
		buyWatching = false;
	}
	
	// Reset the trade block counter if we're still in the same rapid fall or rise situation.
	// This means that apparently the rebound took a little longer than expected to materialize,
	// and we should wait some more. 
	if(tradeBlockCounter > 0 && (
			(ppo < previousPpo && (ppoSpeed > MinBuyReboundSpeed && previousPpo != 0.0) && !noEMABuy) || 
			(ppo > previousPpo && (ppoSpeed > MinSellReboundSpeed && previousPpo != 0.0) && !noEMASell))) {
		tradeBlockCounter = numberOfEMAs;
	}
	
	// If we're not blocked after a dip/peak buy/sell...
	if(tradeBlockCounter <= 0) {

		// If EMAs have crossed, reset the buy/sell blocks that may have resulted from a case 2 or 2.2 BUY or SELL.
		if(previousEmaDiff < 0 && emaDiff >= 0) {
			noEMASell = false;
		} else if(previousEmaDiff >= 0 && emaDiff < 0) {
			noEMABuy = false;
		}
		
		
		/*************************
		 * TRADING DECISION LOGIC
		 *************************/
		
		// BUY case 3: Buy on unsustainable (PPO) fall, as a rebound is expected.
		if(ppo < previousPpo && (ppoSpeed > MinBuyReboundSpeed && previousPpo != 0.0) && !noEMABuy) {
			chrome.browserAction.setBadgeBackgroundColor({color:[0, 128, 0, 200]});
			log("<span style='color: #000000;'>BUY signal triggered on " + date + " at $" + round(price, 2) + "</span>. Unsustainable PPO fall (" + round(ppoSpeed, 3) + "). Rebound expected.");
			ppoSold = false;
			noEMASell = false;
			
			buyBTC(price);
			
			// Keep track of buy-in price.
			tradeBlockBuyPrice = price;
			buyWatching = true;

			tradeBlockCounter = numberOfEMAs;
			state = "BUY3";
		}

		// SELL case 3: Sell on unsustainable (PPO) rise, as a rebound is expected.
		else if(ppo > previousPpo && (ppoSpeed > MinSellReboundSpeed && previousPpo != 0.0) && !noEMASell) {
			chrome.browserAction.setBadgeBackgroundColor({color:[128, 0, 0, 200]});
			log("<span style='color: #000000;'>SELL signal triggered on " + date + " at $" + round(price, 2) + "</span>. Unsustainable PPO rise (" + round(ppoSpeed, 3) + "). Rebound expected.");
			ppoBought = false;
			noEMABuy = false;
			
			sellBTC(price);
			
			sellWatching = true;
			
			tradeBlockCounter = numberOfEMAs;
			state = "SELL3";
		}

		// BUY case 1: Standard EMA cross past buy threshold, provided this buy is currently allowed (i.e. if sold due to PPO cross, prevent this buy from executing immediately after).
		else if (emaDiff >= MinBuyThreshold && !noEMABuy && emaBuyConfirmations >= minEMAConfirmations && state.indexOf("BUY") == -1) {
			chrome.browserAction.setBadgeBackgroundColor({color:[0, 128, 0, 200]});
			log("<span style='color: #000000;'>BUY signal triggered on " + date + " at $" + round(price, 2) + "</span>. EMA difference (" + round(emaDiff, 3) + ") exceeded EMA difference threshold (" + MinBuyThreshold + ").");
			ppoSold = false;

			buyBTC(price);

			state = "BUY1";
		}

		// SELL case 1: Standard EMA cross past sell threshold, provided this sell is currently allowed (i.e. if bought due to PPO cross, prevent this sell from executing immediately after).
		else if (emaDiff <= MinSellThreshold && !noEMASell && emaSellConfirmations >= minEMAConfirmations && state.indexOf("SELL") == -1) {
			chrome.browserAction.setBadgeBackgroundColor({color:[128, 0, 0, 200]});
			log("<span style='color: #000000;'>SELL signal triggered on " + date + " at $" + round(price, 2) + "</span>. EMA difference (" + round(emaDiff, 3) + ") exceeded EMA difference threshold (" + MinSellThreshold + ").");
			ppoBought = false;
			
			sellBTC(price);

			state = "SELL1";
		}

		// BUY case 2: A positive PPO cross faster than the minimum crossing speed.
		else if (previousPpoDiff != ppoDiff && (previousPpoDiff <= 0 && ppoDiff > 0) && ppoSpeed > MinBuyCrossSpeed && state.indexOf("BUY") == -1) {
			chrome.browserAction.setBadgeBackgroundColor({color:[0, 128, 0, 200]});
			log("<span style='color: #000000;'>BUY signal triggered on " + date + " at $" + round(price, 2) + "</span>. PPO crossed at speed " + round(ppoSpeed, 3) + ", which is greater than PPO cross speed threshold " + MinBuyCrossSpeed + ".");
			
			if(emaDiff <= 0) noEMASell = true;  // Prevent selling the very next tick (EMA might still be in sell position)
			ppoBought = true;	// Flag for potential SELL case 2.5 trigger
			ppoSold = false;
			
			buyBTC(price);

			state = "BUY2";
		}
		
		// BUY case 2.2: A PPO rise faster than the minimum rising speed (i.e. exceeding MinBuySpeed). Only triggers if a positive cross has already occurred.
		else if(previousPpoDiff != ppoDiff && previousPpo < ppo && (previousPpoDiff > 0 && ppoDiff > 0) && ppoSpeed > MinBuySpeed && state.indexOf("BUY") == -1) {
			chrome.browserAction.setBadgeBackgroundColor({color:[0, 128, 0, 200]});
			log("<span style='color: #000000;'>BUY signal triggered on " + date + " at $" + round(price, 2) + "</span>. PPO rose at speed " + round(ppoSpeed, 3) + ", which is greater than non-cross speed threshold " + MinBuySpeed + ".");
			
			if(emaDiff <= 0) noEMASell = true;	// Prevent selling the very next tick (EMA might still be in sell position)
			ppoBought = true;	// Flag for potential SELL case 2.5 trigger
			ppoSold = false;
			
			buyBTC(price);

			state = "BUY2.2";
		}

		// SELL case 2.5: A negative PPO cross after a positive PPO cross fast enough to trigger a buy, while EMA is still below its buy threshold. This suggests a misprediction of an uptrend, so sell to cut losses.
		else if (previousPpoDiff != ppoDiff && (previousPpoDiff > 0 && ppoDiff <= 0) && ppoBought && emaDiff < MinBuyThreshold && state.indexOf("SELL") == -1) {
			chrome.browserAction.setBadgeBackgroundColor({color:[128, 0, 0, 200]});
			log("<span style='color: #000000;'>SELL signal triggered on " + date + " at $" + round(price, 2) + "</span>. Negative PPO cross after a PPO-based buy while EMA difference (" + round(emaDiff, 3) + ") is still below its buy threshold of " + MinBuyThreshold + ".");
			
			ppoBought = false;

			sellBTC(price);

			state = "SELL2.5";
		}

		// SELL case 2: A negative PPO cross faster than the minimum crossing speed.
		else if (previousPpoDiff != ppoDiff && (previousPpoDiff > 0 && ppoDiff <= 0) && ppoSpeed > MinSellCrossSpeed && state.indexOf("SELL") == -1) {
			chrome.browserAction.setBadgeBackgroundColor({color:[128, 0, 0, 200]});
			log("<span style='color: #000000;'>SELL signal triggered on " + date + " at $" + round(price, 2) + "</span>. PPO crossed at speed " + round(ppoSpeed, 3) + ", which is greater than PPO cross speed threshold " + MinSellCrossSpeed + ".");
			
			if(emaDiff >= 0) noEMABuy = true;
			ppoSold = true;
			ppoBought = false;

			sellBTC(price);

			state = "SELL2";
		}
		
		// SELL case 2.2: A PPO fall faster than the minimum falling speed (i.e. exceeding MinSellSpeed). Only triggers if a positive cross has already occurred.
		else if(previousPpoDiff != ppoDiff && ppo < previousPpo && (previousPpoDiff <= 0 && ppoDiff <= 0) && ppoSpeed > MinSellSpeed && state.indexOf("SELL") == -1) {
			chrome.browserAction.setBadgeBackgroundColor({color:[128, 0, 0, 200]});
			log("<span style='color: #000000;'>SELL signal triggered on " + date + " at $" + round(price, 2) + "</span>. PPO fell at speed " + round(ppoSpeed, 3) + ", which is greater than non-cross speed threshold " + MinSellSpeed + ".");
			
			if(emaDiff >= 0) noEMABuy = true;
			ppoSold = true;
			ppoBought = false;
			
			sellBTC(price);

			state = "SELL2.2";
		}

		// BUY case 2.5: A positive PPO cross after a negative PPO cross fast enough to trigger a sell, while EMA is still above its sell threshold. This suggests a misprediction of a downtrend, so buy back in.
		else if (previousPpoDiff != ppoDiff && (previousPpoDiff <= 0 && ppoDiff > 0) && ppoSold && emaDiff > MinSellThreshold && state.indexOf("BUY") == -1) {
			chrome.browserAction.setBadgeBackgroundColor({color:[0, 128, 0, 200]});
			log("<span style='color: #000000;'>BUY signal triggered on " + date + " at $" + round(price, 2) + "</span>. Positive PPO cross after a PPO-based sell while EMA difference (" + round(emaDiff, 3) + ") is still above its sell threshold of " + MinSellThreshold + ".");
			
			ppoSold = false;

			buyBTC(price);

			state = "BUY2.5";
		}

		else {
			// If some but not all time-shifted EMAs have crossed...
			if (emaDiff > 0) 	chrome.browserAction.setBadgeBackgroundColor({color:[10, 100, 10, 100]});
			else 				chrome.browserAction.setBadgeBackgroundColor({color:[100, 10, 10, 100]});
		}
	}
	
	tradeBlockCounter--;
}

/**
 * Function for the actual purchase of BTC.
 * 
 * @param price
 */
function buyBTC(price) {
	if((tradingEnabled && fiat > keepFiat) || (!tradingEnabled && VirtualFiat > keepFiat)) {
		if ((tradingEnabled == 1) && (ApiKey != '')) {
			log("<b><span style='color: #00AA00'>BUY at $" + round(price, 2) + "</span>!</b>");
			buyOrder(price);
		} else
			log("<span style='color: #00AA00'>Simulated BUY at $" + round(price, 2) + "</span> (trading disabled)!");
		
		VirtualBTC += ((VirtualFiat - keepFiat) / price) * (1-tradingFee); // Assume flat trading fee.
		VirtualFiat = keepFiat;
		log("Current virtual BTC: " + round(VirtualBTC, 4) + ", virtual fiat: " + round(VirtualFiat, 2));
		
	} else {
		if(tradingEnabled) log("<span style='color: #660000'>No funds available for a buy</span> (current fiat: " + round(fiat, 2) + ", fiat to keep in wallet: " + round(keepFiat, 2) + ").");
		else log("<span style='color: #660000'>No funds available for a buy</span> (current virtual fiat: " + round(VirtualFiat, 2) + ", fiat to keep in virtual wallet: " + round(keepFiat, 2) + ").");
	}
}

/**
 * Function for the actual sale of BTC.
 * 
 * @param price
 */
function sellBTC(price) {
	if((tradingEnabled && BTC > keepBTC) || (!tradingEnabled && VirtualBTC > keepBTC)) {
		if ((tradingEnabled == 1) && (ApiKey != '')) {
			log("<b><span style='color: #BB0000'>SELL at $" + round(price, 2) + "</span>!</b>");
			sellOrder(price);
		} else
			log("<span style='color: #BB0000'>Simulated SELL at $" + round(price, 2) + "</span> (trading disabled)!");
		
		VirtualFiat += ((VirtualBTC - keepBTC) * price) * (1-tradingFee);
		VirtualBTC = keepBTC;
		log("Current virtual BTC: " + round(VirtualBTC, 4) + ", virtual fiat: " + round(VirtualFiat, 2));
		
	} else {
		if(tradingEnabled) log("<span style='color: #660000'>No funds available for a sell</span> (current BTC: " + round(BTC, 4) + ", BTC to keep in wallet: " + round(keepBTC, 4) + ").");
		else log("<span style='color: #660000'>No funds available for a sell</span> (current virtual BTC: " + round(VirtualBTC, 4) + ", BTC to keep in virtual wallet: " + round(keepBTC, 4) + ").");
	}
}

function onOrderProcessed(d) {
	log("Order processed successfully.");
	scheduleBalanceUpdate(2500);
}

/**
 * Send a buy order for BTC to Mt. Gox.
 * 
 * @param price The fiat price to buy at.
 */
function buyOrder(price) {
	var amount = (fiat - keepFiat) / price;
	
	mtGoxPost("BTC" + currency + "/money/order/add", 
			['type=bid','amount_int=' + Math.round(amount*100000000).toString(), 'price_int=' + Math.round((price + 0.001)*100000).toString()],
			function(e) {
				log("Error sending buy request. Retrying in 5 seconds...");
				setTimeout(buyOrder(price), 5000); // retry after 5 seconds
			}, onOrderProcessed);
}

/**
 * Send a sell order for BTC to Mt. Gox.
 * 
 * @param price The fiat price to sell at.
 */
function sellOrder(price) {
	var amount = BTC - keepBTC;
	
	mtGoxPost("BTC" + currency + "/money/order/add", 
			['type=ask','amount_int=' + Math.round(amount*100000000).toString(), 'price_int=' + Math.round((price - 0.001)*100000).toString()], 
			function(e) {
				log("Error sending sell request. Retrying in 5 seconds...");
				setTimeout(sellOrder(price), 5000); // retry after 5 seconds
			}, onOrderProcessed);
}

/**
 * Log a message. A timestamp is added.
 * This is sent to the console, to the log window in the options screen, and saved in the history.
 * 
 * @param s The message
 */
function log(s) {
	var msg = getCurrentTimeString() + ": " + s;
	console.log(msg);
	history += msg + "\n";
	
	if(logWindow != null) {
		logWindow.innerHTML += msg + "<br>";
		logWindow.scrollTop = 99999;
	}
	
	logString += msg + "<br>";
}

function getCurrentTimeString() {
	var t = new Date();
	return dateToDay(t.getTime()) + " " + padIt(t.getHours()) + ":" + padIt(t.getMinutes()) + ":" + padIt(t.getSeconds());
}

function round(value, places) {
    var multiplier = Math.pow(10, places);
    return (Math.round(value * multiplier) / multiplier);
}

function updateHistory() {
	logFile = "log_" + dateToDay(new Date().getTime()) + ".txt";
	if(filer.isOpen) {
		filer.write(logFile, {data: history, type: 'text/plain', append: true}, function(fe, fw) { history = ""; });
	}
}

function fetchNextMinute() {
	if (timeInMinutes.length > 0) {
		return (timeInMinutes[timeInMinutes.length-1] + adjustedTradingIntervalMinutes);
	} else {
		var minuteNow = parseInt((new Date()).getTime() / (adjustedTradingIntervalMinutes*60*1000)) * adjustedTradingIntervalMinutes + globalMinutesShift;
		return (minuteNow - (MaxSamplesToKeep * adjustedTradingIntervalMinutes));
	}
}

function cleanSampleCache() {
	// Clean old, cached items from local storage.
	var minuteFirst = parseInt((new Date()).getTime()/(60*1000)) - (MaxSamplesToKeep + 1) * MaxTradingIntervalMinutes;
	for (var key in localStorage) {
		if (key.indexOf("sample.") == 0) {
			var tid = parseInt(key.substring(7));
			if (tid < minuteFirst) {
				log("cleanSampleCache(): removing old cached item (key=" + key + ").");
				localStorage.removeItem(key);
			}
		}
	}
}

function addSample(minuteFetch, price) {
	timeInMinutes.push(minuteFetch);
	var f = parseFloat(price);
	var f0 = priceArray[priceArray.length-1];
	if ( ((f/9) >= f0) || ((f*9) <= f0) ) { 	// strange peaks elimination - just keep old val // toli: factor 9 is better than 10...
		f = f0;
	}
	priceArray.push(f);

	var sample = localStorage.getItem("sample." + minuteFetch);
	if ((!sample)||(sample == "null")) {
		// The trade does not exist in localStorage - add it.
		localStorage.setItem("sample." + minuteFetch, price);
	}
}

function getUrl(req, url) {
	req.open("GET", url);
	req.send();
}

function getSampleFromMtGox(req, minuteFetch) {
	var since = (minuteFetch*60*1000000).toString();
	if (useAPIv2)
		getUrl(req, MtGoxAPI2BaseURL + "BTCUSD/money/trades/fetch?since=" + since + "&nonce=" + ((new Date()).getTime()*1000)); // Force samples to USD (higher volume)
	else
		getUrl(req, "https://data.mtgox.com/api/0/data/getTrades.php?Currency=USD&since=" + since + "&nonce=" + ((new Date()).getTime()*1000));
}

function refreshPopup(fullRefresh) {
	if ((popupRefresh != null) && (fullRefresh)) {
		try {
			popupRefresh();
		} catch (e) {
			popupRefresh = null;
		}
	} else if (popupUpdateCounter != null) {
		try {
			popupUpdateCounter();
		} catch (e) {
			popupUpdateCounter = null;
		}
	}
}

/**
 * Function to reset all variables and go back to the starting state.
 */
function resetVars() {
	priceArray = [];
	timeInMinutes = [];
	indicators = [];
	noEMABuy = false;
	noEMASell = false;
	ppoBought = false;
	ppoSold = false;
	emaBuyConfirmations  = 0;
	emaSellConfirmations = 0;
	tradeBlockCounter = 0;
	state = "limbo";
}

/**
 * Update the ticker.
 * 
 * @param reset parameter to clear the priceArray data - should be called after changing settings that affects tradingInterval
 */
function updateTicker(reset) {
	if (updateInProgress) {
		log("Update still in progress...");
		if (reset) {
			abortUpdateAndRedo = true;
			log("Reset while update in progress: abort current update...");
		}
		return;
	}

	updateInProgress = true;

	if (reset) {
		log("Resetting price data and re-running simulation (settings have changed)...");
		resetVars();
		bootstrap = 1;
		chrome.browserAction.setBadgeBackgroundColor({color:[128, 128, 128, 50]});
		abortUpdateAndRedo = false;
	}

	var minuteNow = parseInt((new Date()).getTime() / (60*1000));
	var minuteFetch = fetchNextMinute();
	var sample = localStorage.getItem("sample." + minuteFetch);

	if (minuteFetch > minuteNow) {
		updateInProgress = false;
		return;
	}

	while (sample && sample != "null" && minuteFetch <= minuteNow) {
		// As long as trades exist in in local storage: Just add them.
		addSample(minuteFetch, localStorage.getItem("sample." + minuteFetch));

		refreshEMA(false);

		minuteFetch = fetchNextMinute();
		sample = localStorage.getItem("sample." + minuteFetch);
	}

	if (minuteFetch <= minuteNow) {
		// We are not done, and a sample did not exist in localStorage: We need to start fetching from MtGox.
		// But first remove old, cached trades from localStorage.
		cleanSampleCache();

		req = new XMLHttpRequest();
		log("Fetching sample from MtGox...");

		req.onerror = function(e) {
			updateInProgress = false;
			
			if (abortUpdateAndRedo) {
				updateTicker(true);
				return;
			}
			
			refreshPopup(true);
			log("Error getting trades - retrying in 15 seconds...");
			chrome.browserAction.setBadgeText({text: "xxx"});
			retrying = true;
			
			// Try again in 15 seconds.
			setTimeout(function() { updateTicker(false); }, 15*1000);
			return;
		}

		req.onload = function() {
			if (abortUpdateAndRedo) {
				updateInProgress = false;
				retrying = false;
				updateTicker(true);
				return;
			}

			var refr = false;
			var done = true;
			try {
				var jsonData = JSON.parse(req.responseText);
				
				if (useAPIv2)
					jsonData = json.data;

				if (jsonData.length > 0) {
					log("Adding sample from MtGox: $" + jsonData[0].price + ".");
					console.log(getCurrentTimeString() + ": sample." + minuteFetch + " = $" + jsonData[0].price + ".");
					addSample(minuteFetch, jsonData[0].price);
				} else {
					var t =  new Date(minuteFetch*60*1000);					
					log("No trades since " + dateToDay(t.getTime()) + " " + padIt(t.getHours()) + ":" + padIt(t.getMinutes()) + ":" + padIt(t.getSeconds()) + " - retrying in 15 seconds...");

					updateInProgress = false;
					refreshPopup(true);
					retrying = true;
					
					// Try again in 15 seconds.
					setTimeout(function(){updateTicker(false);}, 15*1000);
					return;
				}
				
				retrying = false;
				refreshEMA(false);

				minuteFetch = fetchNextMinute();
				sample = localStorage.getItem("sample." + minuteFetch);
				
				while (sample && sample != "null" && minuteFetch <= minuteNow) {
					// As long as trades exist in in local storage: Just add them.
					
					addSample(minuteFetch, localStorage.getItem("sample." + minuteFetch));
					refreshEMA(false);

					minuteFetch = fetchNextMinute();
					sample = localStorage.getItem("sample." + minuteFetch);
				}
				if (minuteFetch <= minuteNow) {
					// We are not done, but a sample did not exist in local storage: We need to fetch more samples from MtGox.
					getSampleFromMtGox(req, minuteFetch);

					done = false;
					if (bootstrap) {
						chrome.browserAction.setBadgeText({text: ("       |        ").substr((bootstrap++) % 9, 6) });
					}
				} else {
					refr = true;
					bootstrap = 0;
				}
				
			} catch (e) {
				log("JSON error getting trades - retrying in 15 seconds...");
				chrome.browserAction.setBadgeText({text: "xxx"});
				
				updateInProgress = false;
				refreshPopup(true);
				
				retrying = true;
				setTimeout(function(){updateTicker(false);}, 15*1000);
			}

			if (done) updateInProgress = false;
			refreshPopup(refr);
		}
		
		getSampleFromMtGox(req,minuteFetch);
		
	} else {
		// Done, and all samples were loaded from localStorage.
		updateInProgress = false;
		bootstrap = 0;
		refreshPopup(true);
	}
}

/**
 * Update function that is called once every minute.
 */
function startUpdating() {
	if(!retrying) updateTicker(false);
	updateHistory();
}

/**
 * The main loop of the plugin. Sets up a minutely update interval.
 */
function mainLoop() {
	updateTicker(false);
	setInterval(function(){ startUpdating(); }, 60*1000); // Recheck every minute (should be a multiple of any trading interval)
	updateHistory();
}

filer.init({persistent: true, size: 10 * 1024 * 1024}, function(fs){}, function(e) { log('Error: ' + e.name); });
log("Using MtGox API v" + (useAPIv2 ? "2" : "0"));
chrome.browserAction.setBadgeBackgroundColor({color:[128, 128, 128, 50]});
scheduleBalanceUpdate(10);

setTimeout(function(){ updateTicker(false); }, 2*1000); 	// Delay first updateTicker() by 2 seconds to allow user info to be fetched first

log("Synching to update on the full minute + 5 seconds (to allow trades to have appeared)");
var seconds = parseInt(new Date().getSeconds());
if(seconds < 5) {
	log("Current seconds: " + seconds + ", scheduled delay: " + (5 - seconds) + " seconds.");
	setTimeout(mainLoop, (5-seconds)*1000);
} else {
	log("Current seconds: " + seconds + ", scheduled delay: " + (65 - seconds) + " seconds.");
	setTimeout(mainLoop, (65-seconds)*1000);
}
