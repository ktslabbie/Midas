/**
 * @version		1.0
 * @since		May 20th, 2013
 */
package util;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

/**
 * Utility class.
 *
 */
public class Util {
	
	/**
	 * Read a text file and return the contents as a String.
	 * 
	 * @param file The file
	 * @return The (text) file contents
	 */
	public static String readFile(File file) {
		BufferedReader br = null;
		String out = "";
		 
		try {
			String currentLine;
			br = new BufferedReader(new FileReader(file));
			while ((currentLine = br.readLine()) != null) out += currentLine + "\n";
			
		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			try {
				if (br != null) br.close();
			} catch (IOException ex) {
				ex.printStackTrace();
			}
		}
		return out;
	}

	/**
	 * Read a text file from the given path and return the contents as a String.
	 * 
	 * @param file The file path
	 * @return The (text) file contents
	 */
	public static String readFile(String path) {
		return readFile(new File(path));
	}
	
	/**
	 * Sort a generic map by value.
	 * 
	 * @param map
	 * @return The map sorted by value
	 */
	public static <K, V extends Comparable<? super V>> Map<K, V> sortByValue(Map<K, V> map) {
		List<Map.Entry<K, V>> list = new LinkedList<Map.Entry<K, V>>(map.entrySet());
		Collections.sort(list, new Comparator<Map.Entry<K, V>>() {
			public int compare(Map.Entry<K, V> o1, Map.Entry<K, V> o2) {
				return (o1.getValue()).compareTo( o2.getValue() );
			}
		});
		Map<K, V> result = new LinkedHashMap<K, V>();
		for (Map.Entry<K, V> entry : list) result.put(entry.getKey(), entry.getValue());
		return result;
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
