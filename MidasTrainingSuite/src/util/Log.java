/**
 * @version		1.0
 * @since		21 may 2013
 */
package util;

import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;

import config.Configuration;

public class Log {
	
	private static Logger logger;
	
	public static Logger getLogger() {
		if(logger == null){
			PropertyConfigurator.configure(Configuration.PROPERTIES);
			logger = Logger.getLogger("MidasLogger");
		}
		return logger;
	}

	public static void setLogger(Logger logger) {
		Log.logger = logger;
	}
}
