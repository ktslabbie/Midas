/**
 * 
 * @version		1.0
 * @since		22 sep. 2013
 */
package util;

import config.Configuration;

/**
 * Convenience class to read properties from the properties file and store them as variables, mostly to remove clutter from the main class.
 */
public class Vars {
	public static final Configuration c 		= Configuration.getInstance();

	public static final String DATA_FILE_PATH 	= c.getProperty("midas.dataFilePath");
	public static final int NUMBER_OF_EMAS		= Integer.parseInt(c.getProperty("midas.numberOfEMAs"));
	public static final double STARTING_USD 	= Double.parseDouble(c.getProperty("midas.startingUSD"));
	public static final double STARTING_BTC 	= Double.parseDouble(c.getProperty("midas.startingBTC"));
	public static boolean TRAINING_SUITE		= (Integer.parseInt(c.getProperty("trainingSuite.enabled"))) == 1 ? true : false;
	public static final boolean OPTIMIZATION 	= (Integer.parseInt(c.getProperty("trainingSuite.optimization"))) == 1 ? true : false;
	public static final int OPTIMIZATION_ROUNDS = Integer.parseInt(c.getProperty("trainingSuite.optimizationRounds"));
	
	public static String startDate 				= c.getProperty("midas.startDate");
	public static String endDate 				= c.getProperty("midas.endDate");
	
	public static double tradingFee				= Double.parseDouble(c.getProperty("midas.tradingFee"));
	public static double slippageCorrection 	= Double.parseDouble(c.getProperty("midas.slippageCorrection"));

	public static int minEMAConfirmations		= Integer.parseInt(c.getProperty("midas.minEMAConfirmations"));
	public static double emaBuyThreshold 		= Double.parseDouble(c.getProperty("midas.emaBuyThreshold"));
	public static double emaSellThreshold 		= Double.parseDouble(c.getProperty("midas.emaSellThreshold"));
	public static double ppoBuyCrossSpeed 		= Double.parseDouble(c.getProperty("midas.ppoBuyCrossSpeed"));
	public static double ppoSellCrossSpeed 		= Double.parseDouble(c.getProperty("midas.ppoSellCrossSpeed"));
	public static double ppoBuySpeed 			= Double.parseDouble(c.getProperty("midas.ppoBuySpeed"));
	public static double ppoSellSpeed 			= Double.parseDouble(c.getProperty("midas.ppoSellSpeed"));
	public static double ppoBuyReboundSpeed 	= Double.parseDouble(c.getProperty("midas.ppoBuyReboundSpeed"));
	public static double ppoSellReboundSpeed 	= Double.parseDouble(c.getProperty("midas.ppoSellReboundSpeed"));
	
	public static double emaBuyThresholdMin		= Double.parseDouble(c.getProperty("trainingSuite.emaBuyThresholdMin"));
	public static double emaBuyThresholdMax		= Double.parseDouble(c.getProperty("trainingSuite.emaBuyThresholdMax"));
	public static double emaSellThresholdMin	= Double.parseDouble(c.getProperty("trainingSuite.emaSellThresholdMin"));
	public static double emaSellThresholdMax	= Double.parseDouble(c.getProperty("trainingSuite.emaSellThresholdMax"));
	public static double ppoBuyCrossSpeedMin	= Double.parseDouble(c.getProperty("trainingSuite.ppoBuyCrossSpeedMin"));
	public static double ppoBuyCrossSpeedMax	= Double.parseDouble(c.getProperty("trainingSuite.ppoBuyCrossSpeedMax"));
	public static double ppoSellCrossSpeedMin	= Double.parseDouble(c.getProperty("trainingSuite.ppoSellCrossSpeedMin"));
	public static double ppoSellCrossSpeedMax	= Double.parseDouble(c.getProperty("trainingSuite.ppoSellCrossSpeedMax"));
	public static double ppoBuySpeedMin			= Double.parseDouble(c.getProperty("trainingSuite.ppoBuySpeedMin"));
	public static double ppoBuySpeedMax			= Double.parseDouble(c.getProperty("trainingSuite.ppoBuySpeedMax"));
	public static double ppoSellSpeedMin		= Double.parseDouble(c.getProperty("trainingSuite.ppoSellSpeedMin"));
	public static double ppoSellSpeedMax		= Double.parseDouble(c.getProperty("trainingSuite.ppoSellSpeedMax"));
	public static double ppoBuyReboundSpeedMin	= Double.parseDouble(c.getProperty("trainingSuite.ppoBuyReboundSpeedMin"));
	public static double ppoBuyReboundSpeedMax	= Double.parseDouble(c.getProperty("trainingSuite.ppoBuyReboundSpeedMax"));
	public static double ppoSellReboundSpeedMin	= Double.parseDouble(c.getProperty("trainingSuite.ppoSellReboundSpeedMin"));
	public static double ppoSellReboundSpeedMax	= Double.parseDouble(c.getProperty("trainingSuite.ppoSellReboundSpeedMax"));
	public static double step			 		= Double.parseDouble(c.getProperty("trainingSuite.step"));

	public static int startXMonthPeriods		= Integer.parseInt(c.getProperty("trainingSuite.startXMonthPeriods"));
	public static int endXMonthPeriods			= Integer.parseInt(c.getProperty("trainingSuite.endXMonthPeriods"));
}
