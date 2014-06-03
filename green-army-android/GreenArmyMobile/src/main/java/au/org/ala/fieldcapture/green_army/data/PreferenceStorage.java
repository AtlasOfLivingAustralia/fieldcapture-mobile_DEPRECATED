package au.org.ala.fieldcapture.green_army.data;

import android.accounts.Account;
import android.content.ContentValues;
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
    private static final String PROJECT = "project";
    private static final String GPS_QUESTION_KEY = "gpsQuestion";

    private static Account account;

    private static PreferenceStorage instance;
    public synchronized static PreferenceStorage getInstance(Context ctx) {
        if (instance == null) {
            instance = new PreferenceStorage(ctx.getApplicationContext());
        }
        return instance;
    }

    /** For testing only */
    public static synchronized void setInstance(PreferenceStorage storage) {
        instance = storage;
    }

    private Context ctx;

    protected PreferenceStorage(Context ctx) {
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
		return getUsername() != null;
	}
	
	public String getUsername() {
		return PreferenceManager.getDefaultSharedPreferences(ctx).getString(USERNAME_KEY, null);
	}
	
	public Account saveCredentials(String username, String authToken) {
		
		if (username == null) {
			throw new IllegalArgumentException("Username cannot be null");
		}
		if (authToken == null) {
			throw new IllegalArgumentException("Authentication token cannot be null");
		}
        account = null;

        Editor editor = PreferenceManager.getDefaultSharedPreferences(ctx).edit();
		editor.putString(USERNAME_KEY, username);
		editor.commit();

        // We are storing the token in the database as there are issues with cross process
        // synchronization of preferences.
        ContentValues values = new ContentValues(2);
        values.put("userName", username);
        values.put(FieldCaptureContent.TOKEN, authToken);
        ctx.getContentResolver().insert(FieldCaptureContent.userUri(), values);

        return getAccount();
	}

    public void clear() {
        account = null;
        Editor editor = PreferenceManager.getDefaultSharedPreferences(ctx).edit();
        editor.clear();
        editor.commit();
    }

    public Account getAccount() {
        if (account == null) {
            account = new Account(getUsername(), FieldCaptureContent.ACCOUNT_TYPE);
        }
        return account;
    }

    public String getMostRecentProjectId() {
        return PreferenceManager.getDefaultSharedPreferences(ctx).getString(PROJECT, null);
    }

    public void setMostRecentProjectId(String projectId) {
        Editor editor = PreferenceManager.getDefaultSharedPreferences(ctx).edit();
        editor.putString(PROJECT, projectId);
        editor.apply();
    }

    public boolean askedAboutGps() {
        return PreferenceManager.getDefaultSharedPreferences(ctx).getBoolean(GPS_QUESTION_KEY, false);
    }

    public void setAskedAboutGps(boolean askedAboutGps) {
        Editor editor = PreferenceManager.getDefaultSharedPreferences(ctx).edit();
        editor.putBoolean(GPS_QUESTION_KEY, askedAboutGps);
        editor.commit();
    }
}
