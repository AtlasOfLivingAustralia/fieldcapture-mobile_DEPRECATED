package au.org.ala.fieldcapture.green_army.data;

import android.content.ContentValues;
import android.content.Context;
import android.content.UriMatcher;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.net.Uri;

import java.lang.reflect.Field;
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
    private static final int SYNC = 6;
    private static final int USER = 7;
    private static final int ALL = 8;
    private static final UriMatcher uriMatcher = new UriMatcher(UriMatcher.NO_MATCH);

    static {
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.PROJECTS, PROJECTS);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.PROJECTS+"/*/"+ FieldCaptureContent.ACTIVITIES, ACTIVITIES);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.PROJECTS+"/*/"+ FieldCaptureContent.SITES, PROJECT_SITES);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.SITES, SITES);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.SITES+"/*", SITES);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.ACTIVITIES+"/*", ACTIVITIES);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.ACTIVITIES, ACTIVITIES);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.SYNC_STATUS, SYNC);
        uriMatcher.addURI(FieldCaptureContent.AUTHORITY, FieldCaptureContent.USER, USER);
    }

    ThreadLocal<Uri> notifyUri = new ThreadLocal<Uri>();

    @Override
    protected SQLiteOpenHelper getDatabaseHelper(Context context) {
        return FieldCaptureDatabaseHelper.getInstance(getContext());
    }

    @Override
    protected Uri insertInTransaction(Uri uri, ContentValues values) {

        notifyUri.set(uri);
        String table = configForUri(uri, TABLE_KEY);
        mDb.insertWithOnConflict(table, null, values, SQLiteDatabase.CONFLICT_REPLACE);

        return uri;
    }

    @Override
    protected int updateInTransaction(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        notifyUri.set(uri);
        String table = configForUri(uri, TABLE_KEY);
        return mDb.update(table, values, selection, selectionArgs);

    }

    @Override
    protected int deleteInTransaction(Uri uri, String selection, String[] selectionArgs) {
        notifyUri.set(uri);
        if (uri.equals(FieldCaptureContent.deleteAllUri())) {
            int count = 0;
            for (int key : config.keySet()) {
                if (ALL != key) {
                    count += mDb.delete(config.get(key).get(TABLE_KEY), null, null);
                }
            }
            return count;
        }
        else if (uri.equals(FieldCaptureContent.deleteUri())) {
            int count = 0;
            int[] toDelete = new int[] {PROJECTS, ACTIVITIES, SITES};
            for (int key : toDelete) {
                count += mDb.delete(config.get(key).get(TABLE_KEY), null, null);
            }
            return count;
        }
        else {
            throw new IllegalArgumentException("Delete "+uri+" not supported.");
        }
    }

    @Override
    protected void notifyChange() {
        Uri toNotify = notifyUri.get();

        try {
            if (toNotify == null) {
                toNotify = FieldCaptureContent.allProjectsUri();
            }

            if (toNotify.equals(FieldCaptureContent.deleteAllUri())) {
                for (int key : config.keySet()) {
                    if (ALL != key) {
                        String tableUri = config.get(key).get(URI_KEY);
                        if (tableUri != null) {
                            getContext().getContentResolver().notifyChange(Uri.parse(tableUri), null);
                        }
                    }
                }

            } else if (toNotify.equals(FieldCaptureContent.deleteUri())) {
                int[] toDelete = new int[] {PROJECTS, ACTIVITIES, SITES};

                for (int key : toDelete) {
                    String tableUri = config.get(key).get(URI_KEY);

                    if (tableUri != null) {
                        getContext().getContentResolver().notifyChange(Uri.parse(tableUri), null);
                    }
                }
            } else {
                String table = configForUri(toNotify, TABLE_KEY);
                if ("activity".equals(table)) {
                    getContext().getContentResolver().notifyChange(Uri.parse(FieldCaptureContent.ACTIVITY_URI), null);
                } else {
                    getContext().getContentResolver().notifyChange(toNotify, null);
                }
            }
        }
        finally {
            notifyUri.remove();
        }
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {

        String table = configForUri(uri, TABLE_KEY);

        SQLiteDatabase db = getDatabaseHelper(getContext()).getReadableDatabase();

        Cursor result;
        if ("activity".equals(table)) {
            result = joinActivitiesAndSites(selection, selectionArgs, sortOrder, db);
            result.setNotificationUri(getContext().getContentResolver(), Uri.parse(FieldCaptureContent.ACTIVITY_URI));
        }
        else  {
            result = db.query(table, projection, selection, selectionArgs, null, null, sortOrder);
            result.setNotificationUri(getContext().getContentResolver(), uri);
        }

        return result;
    }

    private Cursor joinActivitiesAndSites(String selection, String[] selectionArgs, String sortOrder, SQLiteDatabase db) {
        Cursor result;
        StringBuilder sql = new StringBuilder("SELECT a.*, s.name as siteName, s.description as siteDescription, s.centroidLat as lat, s.centroidLon as lon from activity as a LEFT JOIN site as s on a.siteId=s.siteId");
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
    private static final String URI_KEY = "uri";

    private static Map<Integer, Map<String, String>> config;
    static {
        config = new HashMap<Integer, Map<String, String>>();
        Map<String, String> projectConfig = new HashMap<String, String>(2);
        projectConfig.put(TABLE_KEY, "project");
        projectConfig.put(TYPE_KEY, "vnd.android.cursor.dir/project");
        projectConfig.put(URI_KEY, FieldCaptureContent.PROJECTS_URI);
        config.put(PROJECTS, projectConfig);

        Map<String, String> activityConfig = new HashMap<String, String>(2);
        activityConfig.put(TABLE_KEY, "activity");
        activityConfig.put(TYPE_KEY, "vnd.android.cursor.dir/activity");
        activityConfig.put(URI_KEY, FieldCaptureContent.ACTIVITIES_URI);
        config.put(ACTIVITIES, activityConfig);

        Map<String, String> siteConfig = new HashMap<String, String>(2);
        siteConfig.put(TABLE_KEY, "site");
        siteConfig.put(TYPE_KEY, "vnd.android.cursor.dir/site");
        siteConfig.put(URI_KEY, FieldCaptureContent.SITE_URI);
        config.put(SITES, siteConfig);

        Map<String, String> projectSitesConfig = new HashMap<String, String>(2);
        projectSitesConfig.put(TABLE_KEY, "project_sites");
        projectSitesConfig.put(TYPE_KEY, "vnd.android.cursor.dir/site");
        config.put(PROJECT_SITES, projectSitesConfig);

        Map<String, String> syncConfig = new HashMap<String, String>(2);
        syncConfig.put(TABLE_KEY, "sync_status");
        syncConfig.put(TYPE_KEY, "vnd.android.cursor.dir/sync_status");
        config.put(SYNC, syncConfig);

        Map<String, String> userConfig = new HashMap<String, String>(2);
        userConfig.put(TABLE_KEY, FieldCaptureContent.USER);
        userConfig.put(TYPE_KEY, "vnd.android.cursor.dir/user");
        config.put(USER, userConfig);

        Map<String, String> allConfig = new HashMap<String, String>(2);
        allConfig.put(TABLE_KEY, "");
        allConfig.put(TYPE_KEY, "vnd.android.cursor.dir/all");
        config.put(ALL, allConfig);

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
