/**
 * @author Kristian Slabbekoorn
 * 
 * Javascript code for the pop-up that appears when clicking the plugin button.
 */

var bp = chrome.extension.getBackgroundPage();
var nowDate;
var nowDateStr;

function padIt(d) { return d < 10 ? '0' + d.toString() : d.toString() };

function refreshTable() {
	const wds = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	const bcols = ["#cdcdff", "#d8d8ff", "#e3e3ff", "#eeeeff"];
	
	var tab = document.getElementById("tab");
	document.getElementById("emas").innerHTML = bp.EmaShortPar;
	document.getElementById("emal").innerHTML = bp.EmaLongPar;
	document.getElementById("ppos").innerHTML = bp.PPOEmaShortPar;
	document.getElementById("ppol").innerHTML = bp.PPOEmaLongPar;
	document.getElementById("signal").innerHTML = bp.PPOSignalPar;

	if (bp.tradingIntervalMinutes > 59)
		document.getElementById("int").innerHTML = parseInt(bp.tradingIntervalMinutes/60) + " hour" + (bp.tradingIntervalMinutes > 119 ? "s" : "");
	else document.getElementById("int").innerHTML = bp.tradingIntervalMinutes + " min";

	document.getElementById("buyEMAThresID").innerHTML = bp.MinBuyThreshold;
	document.getElementById("sellEMAThresID").innerHTML = bp.MinSellThreshold;

	document.getElementById("buyPPOCrossSpeedID").innerHTML = bp.MinBuyCrossSpeed;
	document.getElementById("sellPPOCrossSpeedID").innerHTML = bp.MinSellCrossSpeed;
	
	document.getElementById("buyPPOSpeedID").innerHTML = bp.MinBuySpeed;
	document.getElementById("sellPPOSpeedID").innerHTML = bp.MinSellSpeed;
	
	
	document.getElementById("buyPPOReboundSpeedID").innerHTML = bp.MinBuyReboundSpeed;
	document.getElementById("sellPPOReboundSpeedID").innerHTML = bp.MinSellReboundSpeed;

	if (bp.tradingEnabled == 1) {
		document.getElementById("tradingEnabledStatus").style.display = "block";
		document.getElementById("tradingDisabledStatus").style.display = "none";
		document.getElementById("simulatedBalance").style.display = "none";
	} else {
		document.getElementById("tradingEnabledStatus").style.display = "none";
		document.getElementById("tradingDisabledStatus").style.display = "block";
		document.getElementById("simulatedBalance").style.display = "table-row";
		document.getElementById("simulatedFiat").innerHTML = bp.VirtualFiat.toFixed(2) + " USD";
		document.getElementById("simulatedBTC").innerHTML = bp.VirtualBTC.toFixed(3);
	}

	while (tab.rows.length > 5) tab.deleteRow(5);

	nowDate = new Date();
	nowDateStr = nowDate.getFullYear() + "-" + padIt(nowDate.getMonth() + 1) + "-" + padIt(nowDate.getDate());

	var displayLines = Math.min(bp.priceArray.length, bp.LogLines);
	if (bp.updateInProgress) {
		var r = tab.insertRow(5);
		var c = r.insertCell(-1);
		c.colSpan = 9;
		c.innerHTML = "&nbsp;<br>Fetching trading data - please wait...<br>(" + bp.priceArray.length + " of " + bp.MaxSamplesToKeep + " samples loaded)<br>&nbsp;";
		c.style.backgroundColor = "#FFFFFF";
		c.style.textAlign = "center";
		c.id = "loadCell";
	} else {
		if (bp.indicators == null || bp.indicators.length < bp.priceArray.length) {
			bp.refreshEMA(true);
		}

		for (var i = bp.priceArray.length - displayLines; i < bp.priceArray.length; i++) {
			
			var el = bp.indicators[i].emaLong;
			var es = bp.indicators[i].emaShort;
			var sg = bp.indicators[i].signal;
			var ppo = bp.indicators[i].ppo;

			var emaDiff = bp.indicators[i].emaDiff;
			var ppoDiff = bp.indicators[i].ppoDiff;
			var previousPpoDiff = (bp.indicators.length <= bp.numberOfEMAs || i <= bp.numberOfEMAs) ? 0 : bp.indicators[i - (bp.numberOfEMAs)].ppoDiff;
			var previousPpo = (bp.indicators.length <= bp.numberOfEMAs  || i <= bp.numberOfEMAs) ? 0 : bp.indicators[i - (bp.numberOfEMAs)].ppo;
			var ppoSpeed = Math.abs(previousPpo - ppo);

			var r = tab.insertRow(5);
			var d = new Date(bp.timeInMinutes[i]*60*1000);
			r.title = wds[d.getDay()];
			var date = d.getFullYear() + " " + d.getDate() + "/" + (d.getMonth() + 1) + " ";
			
			
			var emaIndex = (bp.timeInMinutes[i] % (bp.tradingIntervalMinutes + bp.globalMinutesShift)) / bp.adjustedTradingIntervalMinutes;
			r.style.backgroundColor = bcols[emaIndex];

			r.insertCell(-1).innerHTML = date + padIt(d.getHours()) + ":"+padIt(d.getMinutes());
			r.insertCell(-1).innerHTML = bp.priceArray[i].toFixed(3);
			r.insertCell(-1).innerHTML = es.toFixed(3);
			r.insertCell(-1).innerHTML = el.toFixed(3);

			var c = r.insertCell(-1);
			c.innerHTML = emaDiff.toFixed(3) + '%';

			if (emaDiff > bp.MinBuyThreshold || emaDiff <= bp.MinSellThreshold) {
				c.style.backgroundColor = emaDiff <= bp.MinSellThreshold ? "#ffd0d0" : "#d0ffd0";
			} else {
				c.style.backgroundColor = emaDiff < 0 ? "#fff0f0" : "#f0fff0";
			}

			var vp = r.insertCell(-1);
			vp.innerHTML = ppo.toFixed(3);
			
			if(ppoSpeed > bp.MinBuyReboundSpeed && previousPpo > ppo) {
				vp.style.backgroundColor = "#b0ddb0";
			} else if (ppoSpeed > bp.MinSellReboundSpeed && previousPpo < ppo) {
				vp.style.backgroundColor = "#ddb0b0";
			}
			
			r.insertCell(-1).innerHTML = sg.toFixed(3);

			var vm = r.insertCell(-1);
			vm.innerHTML = ppoDiff.toFixed(3);

			vm.style.backgroundColor = ppoDiff < 0 ? "#fff0f0" : "#f0fff0";

			var vs = r.insertCell(-1);
			vs.innerHTML = ppoSpeed.toFixed(3);

			if ((ppoSpeed > bp.MinBuyCrossSpeed && previousPpoDiff <= 0 && ppoDiff > 0) ||
				(ppoSpeed > bp.MinBuySpeed && previousPpoDiff > 0 && ppoDiff > 0)) {
				vs.style.backgroundColor = "#b0ddb0";
				vm.style.backgroundColor = "#b0ddb0";
			} else if ((ppoSpeed > bp.MinSellCrossSpeed && previousPpoDiff > 0 && ppoDiff <= 0) ||
					   (ppoSpeed > bp.MinSellSpeed && previousPpoDiff <= 0 && ppoDiff <= 0)) {
				vs.style.backgroundColor = "#ddb0b0";
				vm.style.backgroundColor = "#ddb0b0";
			}
		}
	}

	if (isNaN(bp.fiat) || isNaN(bp.BTC)) {
		document.getElementById("nobalan").style.display = "table-row";
		document.getElementById("balance").style.display = "none";
	} else {
		document.getElementById("nobalan").style.display = "none";
		document.getElementById("balance").style.display = "table-row";
		document.getElementById("usd").innerHTML = bp.fiat.toFixed(2) + " " + bp.currency;
		document.getElementById("btc").innerHTML = bp.BTC.toFixed(3);
	}
	
	if (isNaN(bp.VirtualFiat) || isNaN(bp.VirtualBTC)) {
		document.getElementById("simulatedBalance").style.display = "none";
	} else {
		document.getElementById("simulatedBalance").style.display = "table-row";
		document.getElementById("simulatedFiat").innerHTML = bp.VirtualFiat.toFixed(2) + " USD";
		document.getElementById("simulatedBTC").innerHTML = bp.VirtualBTC.toFixed(3);
	}
}

function popupUpdateCounter() {
	var o=document.getElementById("loadCell");
	if (o) {
		o.innerHTML = "&nbsp;<br>Fetching trading data - please wait...<br>(" + bp.priceArray.length + " of " + bp.MaxSamplesToKeep + " samples loaded)<br>&nbsp;";
	}
}

function formatFirstTooltip(sp, options, fields){
	var d=new Date(fields.x*60*1000);
	var dateStr=d.getFullYear()+"-"+padIt(d.getMonth()+1)+"-"+padIt(d.getDate());
	var t=(dateStr!=nowDateStr?dateStr:"Today")+" "+padIt(d.getHours()) + ":"+padIt(d.getMinutes());
	return '<div align="center">'+t+ '<table width="100%" border="0"><tr><td align="left" class="tooltipTableCell"><span style="color: '+fields.color+'">&#9679;</span> Price: '+formatChartNumbers(fields.y)+'<br>';
}

var lastEmaTime = 0;
var lastEmaShort = 0;

function formatEMAShortTooltip(sp, options, fields){
	lastEmaTime=fields.x;
	lastEmaShort=fields.y;	
	return '<span style="color: '+fields.color+'">&#9679;</span> EMA'+bp.EmaShortPar+': '+formatChartNumbers(fields.y)+'<br>';
}

function formatEMALongTooltip(sp, options, fields){
	var trend = '?';

	//
	// Display EMA S/L %. Helpful for gauging on the graph when trades execute on new trend directions.
	// Round to 3 decimal places.
	//
	var trendIndicator = ((lastEmaShort-fields.y) / ((lastEmaShort+fields.y)/2)) * 100;

	if (lastEmaTime==fields.x) {
		if (trendIndicator>0)
			trend='<img class="trendIndicatorImg" src="trend_'+(trendIndicator>bp.MinBuyThreshold?'strong':'weak')+'_up.gif">';
		else if (trendIndicator<0)
			trend='<img class="trendIndicatorImg" src="trend_'+(-trendIndicator>bp.MinSellThreshold?'strong':'weak')+'_down.gif">';
		else
			trend='none';
	}

	return '<span style="color: '+fields.color+'">&#9679;</span> EMA'+bp.EmaLongPar+': '+formatChartNumbers(fields.y)+'</td></tr></table>Trend: '+trend+' '+formatChartNumbers(trendIndicator)+'%';
}

refreshTable();
bp.popupRefresh = refreshTable;
bp.popupUpdateCounter = popupUpdateCounter;

document.addEventListener('DOMContentLoaded', function() {
	enableTrading.addEventListener('click', function() {
		localStorage.tradingEnabled = bp.tradingEnabled = 1;
		bp.log("<b>Live trading has been enabled!</b>");
		refreshTable();
	});
	disableTrading.addEventListener('click', function() {
		localStorage.tradingEnabled = bp.tradingEnabled = 0;
		bp.log("<b>Live trading has been disabled!</b> Returning to simulation mode.");
		refreshTable();
	});
})
