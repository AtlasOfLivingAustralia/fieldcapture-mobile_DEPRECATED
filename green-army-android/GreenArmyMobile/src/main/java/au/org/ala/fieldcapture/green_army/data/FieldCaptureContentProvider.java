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
    private static final int PROJECT_SITES = 5;
    private static final UriMatcher uriMatcher = new UriMatcher(UriMatcher.NO_MATCH);

    static {
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.PROJECTS, PROJECTS);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.PROJECTS+"/*/"+ FieldCaptureContent.ACTIVITIES, ACTIVITIES);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.PROJECTS+"/*/"+ FieldCaptureContent.SITES, PROJECT_SITES);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.SITES, SITES);
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

        Cursor result;
        if ("activity".equals(table)) {

            result = joinActivitiesAndSites(selection, selectionArgs, sortOrder, db);
        }
        else  {
            result = db.query(table, projection, selection, selectionArgs, null, null, sortOrder);
        }
        result.setNotificationUri(getContext().getContentResolver(), uri);

        return result;
    }

    private Cursor joinActivitiesAndSites(String selection, String[] selectionArgs, String sortOrder, SQLiteDatabase db) {
        Cursor result;
        StringBuilder sql = new StringBuilder("SELECT a.*, s.name as siteName, s.description as siteDescription, s.lat as lat, s.lon as lon from activity as a LEFT JOIN site as s on a.siteId=s.siteId");
        if (selection != null) {
            sql.append(" WHERE ").append(selection);
        }
        if (sortOrder != null) {
            sql.append(" ORDER BY ").append(sortOrder);
        }
        result = db.rawQuery(sql.toString(), selectionArgs);
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
        Map<String, String> projectConfig = new HashMap<String, String>(2);
        projectConfig.put(TABLE_KEY, "project");
        projectConfig.put(TYPE_KEY, "vnd.android.cursor.dir/project");
        config.put(PROJECTS, projectConfig);

        Map<String, String> activityConfig = new HashMap<String, String>(2);
        activityConfig.put(TABLE_KEY, "activity");
        activityConfig.put(TYPE_KEY, "vnd.android.cursor.dir/activity");
        config.put(ACTIVITIES, activityConfig);

        Map<String, String> siteConfig = new HashMap<String, String>(2);
        siteConfig.put(TABLE_KEY, "site");
        siteConfig.put(TYPE_KEY, "vnd.android.cursor.dir/site");
        config.put(SITES, siteConfig);

        Map<String, String> projectSitesConfig = new HashMap<String, String>(2);
        projectSitesConfig.put(TABLE_KEY, "project_sites");
        projectSitesConfig.put(TYPE_KEY, "vnd.android.cursor.dir/site");
        config.put(PROJECT_SITES, projectSitesConfig);

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
