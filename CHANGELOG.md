TODO
================
- Add support for other exchanges.
- Add some way of using limit orders rather than market orders. This will eliminate the slippage loss, but carries the risk of orders not being filled.
  I'm thinking of having a slider to put a bid/ask anywhere between the current bid/ask spread, and updating it every x minutes if not everything has been sold yet.

Midas changelog
================
1.0.6 (11/12/2013)
- Fixed a bug where the bot would stop if broken JSON replies were returned from the Gox API during downtime of their trading engine.

1.0.5 (11/06/2013)
- Fixed another bug that was brought to my attention: if "Keep BTC" or "Keep fiat" were set to values higher than simulated BTC/fiat,
  simulated buy/sell signals would be completely ignored if no trade was possible due to a lack of funds, leading to an erroneous state for live trading and possibly unwanted trades.
  Now signals are triggered regardless of funds, and decisions on whether it is possible to buy/sell or not are made afterwards.
- Related to the above issue, "Keep fiat" for non-USD currencies is disabled for now, since we need a price to calculate the amount of BTC to buy, and we only sample USD price right now.
- Cosmetic improvements to the options screen and log.

1.0.4 (11/05/2013)
- Fixed a bug where sampling would occur at the default times regardless of the "sample interval time shift" set.
- Added a persisting log. Although since Chrome applications are not just allowed to write to anywhere on the file system directly, it's in a bit of an obscure location.
  For example, in Windows 7, full log history can be found in: C:\Users\{UserName}\AppData\Local\Google\Chrome\User Data\Default\File System\{some number}\p\00
  The files have a format "00000000" with an incrementing number. A new file will be created for each day.

1.0.3
- Fixed a rather serious bug that messed up price sampling when changing currencies.
  New samples were taken in the new currency without resetting price data from the previous currency making the indicators go haywire and make many consecutive buys/sells.
  Price sampling is now fixed to USD (highest volume)
- Cleaned up logger by removing some unnecessary data

1.0.2
- Fixed a bug where pressing the "Apply settings" button without changing anything could screw up the timing for the next buy/sell

1.0.1
- Revamped options page into more of a dashboard
- Added real-time log to dashboard

1.0.0
- Initial version of Midas
- Completely changed the trading algorithm from the free EMA trading bot: introduced the PPO indicator and various new conditionals
  (see the Options page of the plugin for an explanation of the algorithm)
- Allow multiple time-shifted versions of the EMA and PPO indicators (calculated over the same sample interval)
- EMA trading signals determined by number of time-shifted EMAs that have passed difference thresholds
- Trade ONLY on signal triggers
- Pop-up includes all additional indicator data and marks where buy/sell signals occur
- Global sample interval time-shift to allow sampling on irregular time points (e.g. 2 minutes before every full hour)
- Simulation mode, showing virtual BTC/Fiat when trading is disabled.
- 3 default parameter profiles (low-frequency, neutral and high-frequency), based on back-tested results (see MidasTrainingSuite /data/results.txt file)
- Fixed sampling from the exchange to 5 seconds past the full minute (if no trade was yet made, retry every 15 seconds) to allow for faster reacting to trading signals
- Removed option to start the bot in active trading mode (for safety)
- Removed chart (never had any use for it, clarkmoody/bitcoinwisdom/bitcoincharts does the job much better)
- Removed sample-based trading conditional (superseded by EMA confirmations)
- Fixed bug where an API request returning an error would crash the bot
- Many more small changes