/**
 * @version		1.0
 * @since		July 25th, 2013
 */

/**
 * Tick data class.
 * Each Tick contains the date, (closing) price, and corresponding indicator values.
 */
class Tick {

	String date;
	private double price, emaShort, emaLong, emaDiff, ppo, signal, ppoDiff;

	/**
	 * Constructor.
	 * 
	 * @param date The date in String format
	 * @param price Closing price at this date
	 * @param emaShort Value of short EMA (EMA(10) by default)
	 * @param emaLong Value of long EMA (EMA(21) by default)
	 * @param emaDiff Absolute difference between short/long EMAs
	 * @param ppo The PPO value (PPO(13, 26) by default)
	 * @param signal The PPO signal value (EMA(9) over PPO by default)
	 * @param ppoDiff Difference between PPO and signal
	 */
	public Tick(String date, double price, double emaShort, double emaLong, double emaDiff, double ppo, double signal,	double ppoDiff) {

		this.date = date;
		this.price = price;
		this.emaShort = emaShort;
		this.emaLong = emaLong;
		this.emaDiff = emaDiff;
		this.ppo = ppo;
		this.signal = signal;
		this.ppoDiff = ppoDiff;
	}

	/**
	 * @return the date
	 */
	public String getDate() {
		return date;
	}
	
	/**
	 * @return the price
	 */
	public double getPrice() {
		return price;
	}
	
	/**
	 * @return the emaShort
	 */
	public double getEmaShort() {
		return emaShort;
	}
	
	/**
	 * @return the emaLong
	 */
	public double getEmaLong() {
		return emaLong;
	}
	
	/**
	 * @return the emaDiff
	 */
	public double getEmaDiff() {
		return emaDiff;
	}
	
	/**
	 * @return the ppo
	 */
	public double getPpo() {
		return ppo;
	}
	
	/**
	 * @return the signal
	 */
	public double getSignal() {
		return signal;
	}
	
	/**
	 * @return the ppoDiff
	 */
	public double getPpoDiff() {
		return ppoDiff;
	}
}
