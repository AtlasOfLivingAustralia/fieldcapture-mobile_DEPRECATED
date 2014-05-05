package au.org.ala.fieldcapture.green_army.data;

import android.content.ContentValues;
import android.content.Context;
import android.content.UriMatcher;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.net.Uri;

import java.util.HashMap;
import java.util.Map;

/**
 * Provides access to project and activity data.
 */
public class FieldCaptureContentProvider extends SQLiteContentProvider {

    private static final int PROJECTS = 1;
    private static final int PROJECT_ID = 2;

    private static final int ACTIVITIES = 3;
    private static final int SITES = 4;
    private static final UriMatcher uriMatcher = new UriMatcher(UriMatcher.NO_MATCH);

    static {
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.PROJECTS, PROJECTS);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.PROJECTS+"/*/"+ FieldCaptureContent.ACTIVITIES, ACTIVITIES);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.SITE, SITES);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.ACTIVITIES+"/*", ACTIVITIES);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.ACTIVITIES, ACTIVITIES);

    }

    @Override
    protected SQLiteOpenHelper getDatabaseHelper(Context context) {
        return FieldCaptureDatabaseHelper.getInstance(getContext());
    }

    @Override
    protected Uri insertInTransaction(Uri uri, ContentValues values) {

        String table = configForUri(uri, TABLE_KEY);
        mDb.insertWithOnConflict(table, null, values, SQLiteDatabase.CONFLICT_REPLACE);

        return uri;
    }

    @Override
    protected int updateInTransaction(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        String table = configForUri(uri, TABLE_KEY);
        return mDb.update(table, values, selection, selectionArgs);

    }

    @Override
    protected int deleteInTransaction(Uri uri, String selection, String[] selectionArgs) {
        if (uri.equals(FieldCaptureContent.deleteUri())) {
            int count = 0;
            for (int key : config.keySet()) {
                count += mDb.delete(config.get(key).get(TABLE_KEY), "1", null);
            }
            return count;
        }
        else {
            throw new IllegalArgumentException("Only "+FieldCaptureContent.deleteUri()+" is supported for deletes");
        }
    }

    @Override
    protected void notifyChange() {
        getContext().getContentResolver().notifyChange(FieldCaptureContent.allProjectsUri(), null);
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {

        String table = configForUri(uri, TABLE_KEY);

        SQLiteDatabase db = getDatabaseHelper(getContext()).getReadableDatabase();

        Cursor result = db.query(table, projection, selection, selectionArgs, null, null, sortOrder);
        result.setNotificationUri(getContext().getContentResolver(), uri);

        return result;
    }


    @Override
    public String getType(Uri uri) {

        return configForUri(uri, TYPE_KEY);

    }


    private static final String TABLE_KEY = "table";
    private static final String TYPE_KEY = "type";

    private static Map<Integer, Map<String, String>> config;
    static {
        config = new HashMap<Integer, Map<String, String>>();
        Map<String, String> projectConfig = new HashMap<String, String>();
        projectConfig.put(TABLE_KEY, "project");
        projectConfig.put(TYPE_KEY, "vnd.android.cursor.dir/project");

        config.put(PROJECTS, projectConfig);

        Map<String, String> activityConfig = new HashMap<String, String>();
        activityConfig.put(TABLE_KEY, "activity");
        activityConfig.put(TYPE_KEY, "vnd.android.cursor.dir/activity");

        config.put(ACTIVITIES, activityConfig);

    }

    private String configForUri(Uri uri, String key) {
        int match = uriMatcher.match(uri);
        Map<String, String> urlConfig = config.get(match);
        if (urlConfig == null) {
            throw new IllegalArgumentException("Invalid or unsupported URI: "+uri);
        }
        return urlConfig.get(key);
    }
}
