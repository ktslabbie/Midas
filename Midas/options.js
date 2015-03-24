/**
 * @author Kristian Slabbekoorn
 * 
 * Javascript code for the options screen.
 */

var bp = chrome.extension.getBackgroundPage();
var showLast = document.getElementById("showLast");
var tradInt = document.getElementById("tradingIntervalMinutes");
var currencyMenu = document.getElementById("currencyID");
var logWindow = document.getElementById("logWindow");
bp.logWindow = logWindow;
logWindow.innerHTML = bp.logString;
logWindow.scrollTop = 99999;


function reset(preset) {
	
	document.getElementById("sampleTimeShiftID").value = 0;
	document.getElementById("numberOfEMAsID").value = 4;
	
	document.getElementById("emaShortID").value = 10;
	document.getElementById("emaLongID").value = 21;

	document.getElementById("ppoShortID").value = 12;
	document.getElementById("ppoLongID").value = 26;
	document.getElementById("signalID").value = 9;
	
	if(preset == 1) {
		document.getElementById("emaBuyThresID").value = 0.00;
		document.getElementById("emaSellThresID").value = -0.70;
		document.getElementById("ppoCrossBuyThresID").value = 0.75;
		document.getElementById("ppoCrossSellThresID").value = 0.50;
		document.getElementById("ppoBuyThresID").value = 1.90;
		document.getElementById("ppoSellThresID").value = 1.40;
		document.getElementById("ppoReboundSpeedBuyThresID").value = 1.30;
		document.getElementById("ppoReboundSpeedSellThresID").value = 1.70;
	} else if(preset == 2) {
		document.getElementById("emaBuyThresID").value = 0.00;
		document.getElementById("emaSellThresID").value = -0.70;
		document.getElementById("ppoCrossBuyThresID").value = 0.75;
		document.getElementById("ppoCrossSellThresID").value = 0.35;
		document.getElementById("ppoBuyThresID").value = 0.75;
		document.getElementById("ppoSellThresID").value = 0.70;
		document.getElementById("ppoReboundSpeedBuyThresID").value = 1.30;
		document.getElementById("ppoReboundSpeedSellThresID").value = 0.75;
	} else {
		document.getElementById("emaBuyThresID").value = 0.05;
		document.getElementById("emaSellThresID").value = -0.70;
		document.getElementById("ppoCrossBuyThresID").value = 0.75;
		document.getElementById("ppoCrossSellThresID").value = 0.35;
		document.getElementById("ppoBuyThresID").value = 1.10;
		document.getElementById("ppoSellThresID").value = 0.70;
		document.getElementById("ppoReboundSpeedBuyThresID").value = 1.30;
		document.getElementById("ppoReboundSpeedSellThresID").value = 1.10;
	}
	
	document.getElementById("emaConfirmationsID").value = 4;
	
	document.getElementById("virtualFiatID").value = 0.0;
	document.getElementById("virtualBTCID").value = 10.0;

	for (var i = 0; i < tradInt.length; i++) {
		if (tradInt[i].value == 60) {
			tradInt.selectedIndex = i;
			break;
		}
	}

	for (var i = 0; i < showLast.length; i++) {
		if (showLast[i].value == 336) {
			showLast.selectedIndex = i;
			break;
		}
	}
}

function save() {
	
	var sampleTimeShift = parseInt(document.getElementById("sampleTimeShiftID").value);
	if (isNaN(sampleTimeShift)) {
		alert("Error: Invalid \"Sample interval time shift\"!");
		return;
	}
	
	var emaBuyThres = parseFloat(document.getElementById("emaBuyThresID").value);
	if (isNaN(emaBuyThres)) {
		alert("Error: Invalid \"EMA buy threshold\"!");
		return;
	}

	var emaSellThres = parseFloat(document.getElementById("emaSellThresID").value);
	if (isNaN(emaSellThres)) {
		alert("Error: Invalid \"EMA sell threshold\"!");
		return;
	}
	
	if (emaBuyThres <= emaSellThres) {
		alert("Error: EMA buy threshold must be larger than EMA sell threshold!");
		return;
	}

	var ppoCrossBuyThres = parseFloat(document.getElementById("ppoCrossBuyThresID").value);
	if (isNaN(ppoCrossBuyThres) || ppoCrossBuyThres < 0) {
		alert("Error: Invalid \"PPO cross buy speed\"!");
		return;
	}

	var ppoCrossSellThres = parseFloat(document.getElementById("ppoCrossSellThresID").value);
	if (isNaN(ppoCrossSellThres) || ppoCrossSellThres < 0) {
		alert("Error: Invalid \"PPO cross sell speed\"!");
		return;
	}
	
	var ppoSpeedBuyThres = parseFloat(document.getElementById("ppoBuyThresID").value);
	if (isNaN(ppoSpeedBuyThres) || ppoSpeedBuyThres < 0) {
		alert("Error: Invalid \"PPO non-cross buy speed\"!");
		return;
	}

	var ppoSpeedSellThres = parseFloat(document.getElementById("ppoSellThresID").value);
	if (isNaN(ppoSpeedSellThres) || ppoSpeedSellThres < 0) {
		alert("Error: Invalid \"PPO non-cross sell speed\"!");
		return;
	}
	
	var ppoReboundSpeedBuyThres = parseFloat(document.getElementById("ppoReboundSpeedBuyThresID").value);
	if (isNaN(ppoReboundSpeedBuyThres) || ppoReboundSpeedBuyThres < 0) {
		alert("Error: Invalid \"PPO buy speed\"!");
		return;
	}

	var ppoReboundSpeedSellThres = parseFloat(document.getElementById("ppoReboundSpeedSellThresID").value);
	if (isNaN(ppoReboundSpeedSellThres) || ppoReboundSpeedSellThres < 0) {
		alert("Error: Invalid \"PPO sell speed\"!");
		return;
	}

	var emaShortPar = parseInt(document.getElementById("emaShortID").value);
	var emaLongPar = parseInt(document.getElementById("emaLongID").value);

	var ppoShortPar = parseInt(document.getElementById("ppoShortID").value);
	var ppoLongPar = parseInt(document.getElementById("ppoLongID").value);
	var signalPar = parseInt(document.getElementById("signalID").value);

	if (isNaN(emaShortPar) || isNaN(emaLongPar)) {
		alert("Error: Invalid \"EMA\"!");
		return;
	}

	if (isNaN(ppoShortPar) || isNaN(ppoLongPar) || isNaN(signalPar)) {
		alert("Error: Invalid \"PPO\"!");
		return;
	}

	if (emaShortPar == emaLongPar) {
		alert("Error: The EMA parameters must be different!");
		return;
	}

	if (ppoShortPar == ppoLongPar) {
		alert("Error: The PPO parameters must be different!");
		return;
	}

	if (emaShortPar < 1 || emaLongPar < 1) {
		alert("Error: EMA parameter must be bigger than 1!");
		return;
	}

	if (ppoShortPar < 1 || ppoLongPar < 1 || signalPar < 1) {
		alert("Error: PPO parameter must be bigger than 1!");
		return;
	}

	if (emaShortPar > bp.MaxSamplesToKeep || emaLongPar > bp.MaxSamplesToKeep) {
		alert("Error: EMA parameter too big - max is " + bp.MaxSamplesToKeep + "!");
		return;
	}

	if (ppoShortPar > bp.MaxSamplesToKeep || ppoLongPar > bp.MaxSamplesToKeep) {
		alert("Error: PPO parameter too big - max is " + bp.MaxSamplesToKeep + "!");
		return;
	}
	
	if (emaShortPar > emaLongPar) {
		var tmp = emaShortPar;
		emaShortPar = emaLongPar;
		emaLongPar = tmp;
		document.getElementById("emaShortID").value = emaShortPar;
		document.getElementById("emaLongID").value = emaLongPar;
	}
	
	if (ppoShortPar > ppoLongPar) {
		var tmp = ppoShortPar;
		ppoShortPar = ppoLongPar;
		ppoLongPar = tmp;
		document.getElementById("ppoShortID").value = ppoShortPar;
		document.getElementById("ppoLongID").value = ppoLongPar;
	}
	
	var numberOfEMAs = parseInt(document.getElementById("numberOfEMAsID").value);
	var minEMAConfirmations = parseInt(document.getElementById("emaConfirmationsID").value);
	
	if (isNaN(numberOfEMAs) || numberOfEMAs < 0 || numberOfEMAs > 4) {
		alert("Error: Invalid \"Number of time-shifted indicators\"!");
		return;
	}
	
	if (isNaN(minEMAConfirmations) || minEMAConfirmations < 0 || minEMAConfirmations > numberOfEMAs) {
		alert("Error: Invalid \"Number of EMA confirmations\"!");
		return;
	}

	var currency = currencyMenu.value;
	var keepFiat = 0;
	
	if(currency != "USD") {
		if(parseFloat(document.getElementById("keepFiat").value) > 0) alert("Note: 'Fiat to keep in wallet' for non-USD currencies is currently unsupported.");
		document.getElementById("keepFiat").value = 0;
		document.getElementById("keepFiat").disabled = true;
	} else {
		document.getElementById("keepFiat").disabled = false;
		keepFiat = parseFloat(document.getElementById("keepFiat").value);
	}
	
	var keepBTC = parseFloat(document.getElementById("keepBTC").value);
	
	var virtualFiat = parseFloat(document.getElementById("virtualFiatID").value);
	var virtualBTC = parseFloat(document.getElementById("virtualBTCID").value);
	
	if (isNaN(keepFiat) || keepFiat < 0) {
		alert("Error: Invalid \"Keep Fiat\"!");
		return;
	}
	
	if (isNaN(keepBTC) || keepBTC < 0) {
		alert("Error: Invalid \"Keep BTC\"!");
		return;
	}
	
	if (isNaN(virtualFiat) || virtualFiat < 0) {
		alert("Error: Invalid \"Virtual Fiat\"!");
		return;
	}
	
	if (isNaN(virtualBTC) || virtualBTC < 0) {
		alert("Error: Invalid \"Virtual BTC\"!");
		return;
	}

	localStorage.ApiKey = bp.ApiKey = document.getElementById("apikey").value;
	localStorage.ApiSec = bp.ApiSec = document.getElementById("apisec").value;
	
	bp.schedUpdateInfo(10);
	
	var tradIntChanged = false;
	
	// Just refresh everything with *every* change except number of lines to show; too much work to re-calculate states/EMA confirmations/etc. otherwise.
	if (bp.EmaShortPar != emaShortPar || bp.EmaLongPar != emaLongPar || bp.MinBuyThreshold != emaBuyThres || bp.MinSellThreshold != emaSellThres 
			|| bp.PPOEmaShortPar != ppoShortPar || bp.PPOEmaLongPar != ppoLongPar || bp.PPOSignalPar != signalPar 
			|| bp.MinBuyCrossSpeed != ppoCrossBuyThres || bp.MinSellCrossSpeed != ppoCrossSellThres
			|| bp.MinBuySpeed != ppoSpeedBuyThres || bp.MinSellSpeed != ppoSpeedSellThres //|| bp.VirtualFiat != virtualFiat || bp.VirtualBTC != virtualBTC
			|| bp.MinBuyReboundSpeed != ppoReboundSpeedBuyThres || bp.MinSellReboundSpeed != ppoReboundSpeedSellThres || bp.tradingIntervalMinutes != parseInt(tradInt.value)
			|| bp.numberOfEMAs != numberOfEMAs || bp.minEMAConfirmations != minEMAConfirmations || bp.globalMinutesShift != sampleTimeShift) {
		if (!confirm("Applying different settings. Past data/trades will be recalculated and real trading disabled."))  return;
		tradIntChanged = true;
	}
	
	localStorage.currency = bp.currency = currency;
	localStorage.keepFiat = bp.keepFiat = keepFiat;
	localStorage.keepBTC = bp.keepBTC = keepBTC;

	localStorage.VirtualFiat = bp.VirtualFiat = virtualFiat;
	localStorage.VirtualBTC = bp.VirtualBTC = virtualBTC;
	
	localStorage.globalMinutesShift = bp.globalMinutesShift = sampleTimeShift;
	localStorage.numberOfEMAs = bp.numberOfEMAs = numberOfEMAs;
	localStorage.MaxSamplesToKeep = bp.MaxSamplesToKeep = (336 * bp.numberOfEMAs) + bp.numberOfEMAs;
	localStorage.minEMAConfirmations = bp.minEMAConfirmations = minEMAConfirmations;
	
	localStorage.tradingIntervalMinutes = bp.tradingIntervalMinutes = parseInt(tradInt.value);
	localStorage.adjustedTradingIntervalMinutes = bp.adjustedTradingIntervalMinutes = bp.tradingIntervalMinutes / bp.numberOfEMAs;
	
	localStorage.LogLines = bp.LogLines = parseInt(showLast.value) * 60 / bp.adjustedTradingIntervalMinutes;
	
	localStorage.EmaShortPar = bp.EmaShortPar = emaShortPar;
	localStorage.EmaLongPar = bp.EmaLongPar = emaLongPar;

	localStorage.PPOEmaShortPar = bp.PPOEmaShortPar = ppoShortPar;
	localStorage.PPOEmaLongPar = bp.PPOEmaLongPar = ppoLongPar;
	localStorage.PPOSignalPar = bp.PPOSignalPar = signalPar;

	localStorage.MinBuyThreshold = bp.MinBuyThreshold = emaBuyThres;
	localStorage.MinSellThreshold = bp.MinSellThreshold = emaSellThres;
	localStorage.MinBuyCrossSpeed = bp.MinBuyCrossSpeed = ppoCrossBuyThres;
	localStorage.MinSellCrossSpeed = bp.MinSellCrossSpeed = ppoCrossSellThres;
	localStorage.MinBuySpeed = bp.MinBuySpeed = ppoSpeedBuyThres;
	localStorage.MinSellSpeed = bp.MinSellSpeed = ppoSpeedSellThres;
	localStorage.MinBuyReboundSpeed = bp.MinBuyReboundSpeed = ppoReboundSpeedBuyThres;
	localStorage.MinSellReboundSpeed = bp.MinSellReboundSpeed = ppoReboundSpeedSellThres;

	 if (tradIntChanged) {
		logWindow.innerHTML = "";
		bp.logString = "";
		bp.updateTicker(true); // call updateTicker() with reset==true instead to also reset the priceArray if trading interval has changed (current data in priceArray is no good)
	}
	 
	bp.refreshPopup(true);
	
	bp.log("Settings saved!");
}

function setfields() {
	document.getElementById("apikey").value = bp.ApiKey;
	document.getElementById("apisec").value = bp.ApiSec;
	
	document.getElementById("sampleTimeShiftID").value = bp.globalMinutesShift;
	document.getElementById("numberOfEMAsID").value = bp.numberOfEMAs;
	
	document.getElementById("emaShortID").value = bp.EmaShortPar.toString();
	document.getElementById("emaLongID").value = bp.EmaLongPar.toString();

	document.getElementById("ppoShortID").value = bp.PPOEmaShortPar.toString();
	document.getElementById("ppoLongID").value = bp.PPOEmaLongPar.toString();
	document.getElementById("signalID").value = bp.PPOSignalPar.toString();

	document.getElementById("emaBuyThresID").value = bp.MinBuyThreshold.toFixed(2);
	document.getElementById("emaSellThresID").value = bp.MinSellThreshold.toFixed(2);

	document.getElementById("ppoCrossBuyThresID").value = bp.MinBuyCrossSpeed.toFixed(2);
	document.getElementById("ppoCrossSellThresID").value = bp.MinSellCrossSpeed.toFixed(2);
	
	document.getElementById("ppoBuyThresID").value = bp.MinBuySpeed.toFixed(2);
	document.getElementById("ppoSellThresID").value = bp.MinSellSpeed.toFixed(2);
	
	document.getElementById("ppoReboundSpeedBuyThresID").value = bp.MinBuyReboundSpeed.toFixed(2);
	document.getElementById("ppoReboundSpeedSellThresID").value = bp.MinSellReboundSpeed.toFixed(2);
	
	document.getElementById("emaConfirmationsID").value = bp.minEMAConfirmations;

	//document.getElementById("currencyID").value = bp.currency;
	document.getElementById("keepFiat").value = bp.keepFiat.toString();
	document.getElementById("keepBTC").value = bp.keepBTC.toString();
	
	document.getElementById("virtualFiatID").value = bp.VirtualFiat.toFixed(2);
	document.getElementById("virtualBTCID").value = bp.VirtualBTC.toFixed(4);

	for (var i = 0; i < showLast.options.length; i++) {
		if (parseInt(showLast.options[i].value) == (bp.LogLines * (bp.tradingIntervalMinutes / bp.numberOfEMAs) / 60)) {
			showLast.selectedIndex = i;
			break;
		}
	}

	for (var i = 0; i < tradInt.options.length; i++) {
		if (parseInt(tradInt.options[i].value) == bp.tradingIntervalMinutes) {
			tradInt.selectedIndex = i;
			break;
		}
	}
	
	for (var i = 0; i < currencyMenu.options.length; i++) {
		if (currencyMenu.options[i].value == bp.currency) {
			currencyMenu.selectedIndex = i;
			break;
		}
	}

	intervalChanged();
}

function intervalChanged() {
	var maxHours = parseInt(bp.MaxSamplesToKeep * parseInt(tradInt.value) / 60);
	parseInt(showLast.value * 60 / localStorage.tradingIntervalMinutes);
	var currentShowLastValue = parseInt(showLast.value);

	for (var i = showLast.options.length - 1; i >= 0; i--) {
		if (parseInt(showLast.options[i].value) > maxHours) {
			showLast.options[i].disabled = true;
			showLast.options[i].style.color = "#B0B0B0";
		} else {
			showLast.options[i].disabled = false;
			showLast.options[i].style.color = "#000000";
			if (currentShowLastValue > maxHours) {
				showLast.selectedIndex = i;
				currentShowLastValue = showLast.options[i].value;
			}
		}
	}
	
	if(currencyMenu.value != "USD") {
		if(parseFloat(document.getElementById("keepFiat").value) > 0) alert("Note: 'Fiat to keep in wallet' for non-USD currencies is currently unsupported.");
		document.getElementById("keepFiat").value = 0;
		document.getElementById("keepFiat").disabled = true;
	} else {
		document.getElementById("keepFiat").disabled = false;
	}
}

document.addEventListener('DOMContentLoaded', function() {
	butres.addEventListener('click', function(){ reset(0); });
	butreshigh.addEventListener('click', function(){ reset(1); });
	butreslow.addEventListener('click', function(){ reset(2); });
	butsav.addEventListener('click', function(){ save(); });
	currencyMenu.addEventListener('change', function(){ intervalChanged(); });
	tradingIntervalMinutes.addEventListener('change', function(){ intervalChanged(); });
	setfields();
})
