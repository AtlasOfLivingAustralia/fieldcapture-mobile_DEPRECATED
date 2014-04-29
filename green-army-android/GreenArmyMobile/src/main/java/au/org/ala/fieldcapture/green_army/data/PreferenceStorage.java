package au.org.ala.fieldcapture.green_army.data;

import android.content.Context;
import android.content.SharedPreferences.Editor;
import android.preference.Preference;
import android.preference.PreferenceManager;

/**
 * Manages persistence of user preferences (including username and session key).
 */
public class PreferenceStorage {

	private static final String TOKEN_KEY = "authToken";
	private static final String USERNAME_KEY = "username";
    private static final String FIRST_USE_KEY = "firstUse";

    private static PreferenceStorage instance;

	private Context ctx;

    public synchronized static PreferenceStorage getInstance(Context ctx) {
        return new PreferenceStorage(ctx.getApplicationContext());
    }

	private PreferenceStorage(Context ctx) {
		this.ctx = ctx;
	}

    public boolean getFirstUse() {
        return PreferenceManager.getDefaultSharedPreferences(ctx).getBoolean(FIRST_USE_KEY, true);
    }

    public void setFirstUse(boolean firstUse) {
        Editor editor = PreferenceManager.getDefaultSharedPreferences(ctx).edit();
        editor.putBoolean(FIRST_USE_KEY, firstUse);
        editor.commit();
    }

	public boolean isAuthenticated() {
		return getAuthToken() != null;
	}
	
	public String getAuthToken() {
		return PreferenceManager.getDefaultSharedPreferences(ctx).getString(TOKEN_KEY, null);
	}
	
	public String getUsername() {
		return PreferenceManager.getDefaultSharedPreferences(ctx).getString(USERNAME_KEY, null);
	}
	
	public void saveCredentials(String username, String authToken) {
		
		if (username == null) {
			throw new IllegalArgumentException("Username cannot be null");
		}
		if (authToken == null) {
			throw new IllegalArgumentException("Authentication token cannot be null");
		}
		Editor editor = PreferenceManager.getDefaultSharedPreferences(ctx).edit();
		editor.putString(USERNAME_KEY, username);
		editor.putString(TOKEN_KEY, authToken);
		editor.commit();
	}

    public void clear() {
        Editor editor = PreferenceManager.getDefaultSharedPreferences(ctx).edit();
        editor.putString(USERNAME_KEY, null);
        editor.putString(TOKEN_KEY, null);
        editor.commit();
    }
}
